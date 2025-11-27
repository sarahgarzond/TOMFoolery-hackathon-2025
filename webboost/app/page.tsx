'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { isSignedIn } = useUser();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Database Hooks
  const saveAudit = useMutation(api.audits.save);
  const audits = useQuery(api.audits.list) || [];

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);

    try {
      // 1. Call your Vercel Scraper API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url })
      });

      const json = await response.json();

      if (json.success) {
        // 2. Save result to Convex DB
        await saveAudit({
          url,
          mobileAdDensity: json.data.mobileAdDensity,
          hasSchema: json.data.hasSchema,
          status: 'success',
        });
        setUrl(''); // Reset input
      } else {
        alert("Analysis failed: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg"></div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WebBoost</h1>
          </div>
          {isSignedIn ? <UserButton /> : <SignInButton><Button>Sign In</Button></SignInButton>}
        </header>

        {isSignedIn ? (
          <>
            {/* Input Section */}
            <Card className="mb-12 border-none shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste food blog URL (e.g., https://pinchofyum.com/recipe...)"
                    className="h-12 text-lg"
                    disabled={loading}
                  />
                  <Button size="lg" onClick={handleAnalyze} disabled={loading || !url} className="h-12 px-8 font-semibold">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning</> : 'Audit Site'}
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-3 ml-1">
                  Checks Mobile Ad Density & Schema.org Compliance
                </p>
              </CardContent>
            </Card>

            {/* Results Grid */}
            <div className="grid gap-4">
              <h2 className="text-lg font-semibold text-slate-700 mb-2">Recent Audits</h2>
              {audits.length === 0 && (
                <div className="text-center py-10 text-slate-400">No audits yet. Run your first scan above!</div>
              )}

              {audits.map((audit) => (
                <Card key={audit._id} className="hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium flex justify-between items-center">
                      <span className="truncate max-w-[60%]">{audit.url}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        {new Date(audit.timestamp).toLocaleDateString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-8 mt-2">
                      {/* Metric 1: Ad Density */}
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ad Density</div>
                        <div className={`text-2xl font-bold ${audit.mobileAdDensity > 30 ? 'text-red-500' : 'text-green-500'}`}>
                          {audit.mobileAdDensity}%
                        </div>
                        <div className="text-[10px] text-slate-400">Target: &lt;30%</div>
                      </div>

                      {/* Metric 2: Schema */}
                      <div>
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Recipe Schema</div>
                        <Badge variant={audit.hasSchema ? "default" : "destructive"} className="mt-1">
                          {audit.hasSchema ? "DETECTED" : "MISSING"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-6">Is your blog ready for Mediavine?</h2>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Scan your site for the "Invisible Killers" of ad revenue: High Ad Density and Broken Schema.
            </p>
            <SignInButton mode="modal">
              <Button size="lg" className="text-lg px-10 py-6 h-auto">Start Free Audit</Button>
            </SignInButton>
          </div>
        )}
      </div>
    </div>
  );
}
