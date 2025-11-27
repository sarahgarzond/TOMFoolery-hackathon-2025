import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// Vercel Config: Increase timeout to 60 seconds (max for Hobby plan)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

        console.log("Starting analysis for:", url);

        let browser;

        // 1. Configure Browser (Local vs Production)
        if (process.env.CHROME_EXECUTABLE_PATH) {
            // LOCAL DEV: Use your local Chrome
            browser = await puppeteer.launch({
                args: ['--no-sandbox'],
                executablePath: process.env.CHROME_EXECUTABLE_PATH,
                headless: true,
            });
        } else {
            // PRODUCTION: Use Sparticuz Chromium v141
            chromium.setGraphicsMode = false;
            browser = await puppeteer.launch({
                args: (chromium as any).args,
                defaultViewport: (chromium as any).defaultViewport,
                executablePath: await chromium.executablePath(
                    "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar"
                ),
                headless: (chromium as any).headless,
            });
        }

        const page = await browser.newPage();

        // 2. Emulate Mobile (iPhone 12 Pro dimensions) - Critical for Ad Density
        await page.setViewport({ width: 390, height: 844 });

        // 3. Navigate to page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // 4. Extract Data from DOM
        const result = await page.evaluate(() => {
            // Metric A: Ad Density
            const contentHeight = document.body.scrollHeight;
            // Selectors for common ad networks (Mediavine, Raptive, AdSense)
            const adSelectors = '.ad-slot,.adsbygoogle,.mv-ad-box, [id^="ad-"], iframe[title*="advertisement"]';
            const adElements = document.querySelectorAll(adSelectors);

            let totalAdHeight = 0;
            adElements.forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.height > 0) totalAdHeight += rect.height;
            });

            const density = contentHeight > 0 ? (totalAdHeight / contentHeight) * 100 : 0;

            // Metric B: Schema Check
            const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const hasRecipeSchema = schemas.some(s => {
                const content = s.innerHTML.toLowerCase();
                return content.includes('"@type":"recipe"') || content.includes('"@type": "recipe"');
            });

            return {
                mobileAdDensity: Math.round(density),
                hasSchema: hasRecipeSchema,
                wordCount: document.body.innerText.split(/\s+/).length,
            };
        });

        await browser.close();
        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        console.error("Scrape Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
