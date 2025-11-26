'use client';
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { isSignedIn } = useUser();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const saveAudit = useMutation(api.audits.save);
  const audits = useQuery(api.audits.list) || [];

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    try {
      // 1. Call Vercel API
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ url })
      });
      const json = await res.json();

      if (json.success) {
        // 2. Save to Convex
        await saveAudit({
          url,
          mobileAdDensity: json.data.mobileAdDensity,
          hasSchema: json.data.hasSchema,
          status: 'success',
        });
        setUrl(''); // Clear input
      } else {
        alert("Audit failed: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900">WebBoost 🚀</h1>
          {isSignedIn ? <UserButton /> : <SignInButton><Button>Sign In</Button></SignInButton>}
        </header>

        {isSignedIn ? (
          <>
            <Card className="mb-10">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://pinchofyum.com/best-soup-recipe"
                    disabled={loading}
                  />
                  <Button onClick={handleAnalyze} disabled={loading || !url}>
                    {loading ? 'Analyzing...' : 'Audit Site'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <h2 className="text-xl font-semibold text-slate-700">Past Audits</h2>
              {audits.length === 0 && <p className="text-slate-500">No audits yet.</p>}

              {audits.map((audit) => (
                <Card key={audit._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex justify-between">
                      <span className="truncate">{audit.url}</span>
                      <span className="text-sm text-slate-400">
                        {new Date(audit.timestamp).toLocaleDateString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-6 mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 uppercase">Ad Density</span>
                        <span className={`text-2xl font-bold ${audit.mobileAdDensity > 30 ? 'text-red-500' : 'text-green-500'}`}>
                          {audit.mobileAdDensity}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-500 uppercase">Schema</span>
                        <Badge variant={audit.hasSchema ? "default" : "destructive"} className="mt-1">
                          {audit.hasSchema ? "Detected" : "Missing"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Optimize your Food Blog Revenue</h2>
            <p className="mb-8">Sign in to start auditing your ad density and technical SEO.</p>
            <SignInButton><Button size="lg">Get Started</Button></SignInButton>
          </div>
        )}
      </div>
    </div>
  );
}
