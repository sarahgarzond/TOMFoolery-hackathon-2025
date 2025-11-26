import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export const maxDuration = 60; // Maximum allowed on Vercel Hobby
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { url } = await req.json();
        if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

        let browser;

        // LOCAL DEVELOPMENT LOGIC
        if (process.env.CHROME_EXECUTABLE_PATH) {
            browser = await puppeteer.launch({
                args: ['--no-sandbox'],
                executablePath: process.env.CHROME_EXECUTABLE_PATH,
                headless: true,
            });
        }
        // VERCEL PRODUCTION LOGIC
        else {
            chromium.setGraphicsMode = false;
            browser = await puppeteer.launch({
                args: (chromium as any).args,
                defaultViewport: (chromium as any).defaultViewport,
                executablePath: await chromium.executablePath(
                    // MUST MATCH YOUR @sparticuz/chromium-min VERSION (v141)
                    "https://github.com/Sparticuz/chromium/releases/download/v141.0.0/chromium-v141.0.0-pack.tar"
                ),
                headless: (chromium as any).headless,
            });
        }

        const page = await browser.newPage();
        // Emulate Mobile (iPhone 12 Pro)
        await page.setViewport({ width: 390, height: 844 });

        // Navigate with 15s timeout to be safe
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // EVALUATE PAGE CONTENT
        const data = await page.evaluate(() => {
            const contentHeight = document.body.scrollHeight;
            // Select common ad containers (Mediavine, Raptive, AdSense)
            const adElements = document.querySelectorAll('.ad-slot,.adsbygoogle,.mv-ad-box, [id^="ad-"], iframe[title*="advertisement"]');

            let adHeight = 0;
            adElements.forEach(el => {
                if (el.getBoundingClientRect().height > 0) {
                    adHeight += el.getBoundingClientRect().height;
                }
            });

            // Calculate Density
            const density = contentHeight > 0 ? (adHeight / contentHeight) * 100 : 0;

            // Check Schema
            const schemas = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const hasRecipeSchema = schemas.some(s =>
                s.innerHTML.toLowerCase().includes('"@type": "recipe"') ||
                s.innerHTML.toLowerCase().includes('"@type":"recipe"')
            );

            return {
                mobileAdDensity: Math.round(density),
                hasSchema: hasRecipeSchema,
            };
        });

        await browser.close();
        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Scrape Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
