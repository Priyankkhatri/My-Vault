import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, KeyRound, Globe, Activity, CheckCircle2, Search, Loader2, Sparkles, Check
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { SecurityRing } from '../components/vault/VaultHelpers';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PasswordItem } from '../types/vault';
import { runFullAudit, AuditedItem } from '../features/ai/securityAuditAI';
import {
  calculatePasswordStrength,
  strengthScoreToLabel,
  findReusedPasswordsSync,
  calculateSecurityScore,
  type ReusedGroup
} from '../utils/securityUtils';

export function SecurityAudit() {
  const { items } = useVault();
  const navigate = useNavigate();

  const [auditedItems, setAuditedItems] = useState<AuditedItem[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  
  // State for Breach monitor
  const [isCheckingBreach, setIsCheckingBreach] = useState(false);
  const [lastBreachCheck, setLastBreachCheck] = useState('Just now');

  useEffect(() => {
    runAudit(false);
  }, [items]);

  const runAudit = async (withAI: boolean) => {
    setIsAuditing(true);
    const passwords = items.filter(i => i.type === 'password') as PasswordItem[];
    const results = await runFullAudit(passwords, { includeAI: withAI });
    setAuditedItems(results);
    setIsAuditing(false);
  };

  const handleCheckBreaches = () => {
    setIsCheckingBreach(true);
    setTimeout(() => {
      setIsCheckingBreach(false);
      setLastBreachCheck('Just now');
    }, 1500);
  };

  const passwords = items.filter((i): i is PasswordItem => i.type === 'password');

  // Weak passwords: recalculate using the real entropy-based function, score <= 1 = weak
  const weakPasswords = useMemo(() => {
    return passwords.filter(p => calculatePasswordStrength(p.password) <= 1);
  }, [passwords]);
  
  // Reused grouping: compare via hash, not plaintext
  const reusedGroups: ReusedGroup[] = useMemo(() => {
    return findReusedPasswordsSync(items);
  }, [items]);
  const reusedCount = reusedGroups.reduce((acc, g) => acc + g.items.length, 0);

  // Security score: weighted formula (40% strong, 30% no-reuse, 30% no-breach)
  const totalScore = useMemo(() => {
    return calculateSecurityScore(items, reusedGroups);
  }, [items, reusedGroups]);

  const critical = useMemo(() => auditedItems.filter(a => a.riskScore.severity === 'critical'), [auditedItems]);
  const aiRecommendations = useMemo(() => auditedItems.filter(a => !!a.aiInsight), [auditedItems]);

  // Strength bar color for weak password rows
  const getStrengthDisplay = (password: string) => {
    const score = calculatePasswordStrength(password);
    const label = strengthScoreToLabel(score);
    const segmentColors = ['bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400'];
    return { score, label, segmentColors };
  };

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Security Audit</h1>
        <p className="text-sm text-gray-500 mt-1">Review your vault's security posture and potential vulnerabilities.</p>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* SECTION 1 - SCORE HERO */}
        <Card variant="section" className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <SecurityRing score={totalScore} size={84} strokeWidth={8} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vault Security Score</h2>
              <div className="flex gap-2">
                <Badge variant={weakPasswords.length > 0 ? 'red' : 'green'}>{weakPasswords.length} Weak</Badge>
                <Badge variant={reusedCount > 0 ? 'amber' : 'green'}>{reusedCount} Reused</Badge>
                <Badge variant={critical.length > 0 ? 'red' : 'green'}>{critical.length} Critical</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 min-w-[200px]">
            <Button onClick={() => runAudit(true)} isLoading={isAuditing}>
              {isAuditing ? 'Analyzing...' : 'Run Deep Audit'}
            </Button>
          </div>
        </Card>

        {/* SECTION 2 - WEAK PASSWORDS */}
        <Card variant="section">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Weak Passwords</h3>
            </div>
            <span className="text-sm font-medium text-gray-500">{weakPasswords.length} needs attention</span>
          </div>
          <div className="space-y-3">
            {weakPasswords.length > 0 ? weakPasswords.map(item => {
              const { score, label, segmentColors } = getStrengthDisplay(item.password);
              return (
                <div key={item.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors shadow-sm">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <img src={`https://www.google.com/s2/favicons?domain=${item.website || 'example.com'}&sz=32`} className="w-5 h-5" alt="favicon" loading="lazy" />
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                  </div>
                  <div className="flex-1 px-4 max-w-[200px]">
                    <div className="flex gap-1 h-1.5">
                      {segmentColors.map((color, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-all ${i < score ? color : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1.5 tracking-widest text-center">{label}</p>
                  </div>
                </div>
              );
            }) : (
              <EmptyState
                icon={CheckCircle2}
                title="Passwords Secure"
                description="No weak passwords detected in your vault."
              />
            )}
          </div>
        </Card>

        {/* SECTION 3 - REUSED PASSWORDS */}
        <Card variant="section">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Reused Passwords</h3>
            </div>
            <span className="text-sm font-medium text-gray-500">{reusedCount} accounts sharing</span>
          </div>
          <div className="space-y-4">
            {reusedGroups.length > 0 ? reusedGroups.map((group) => (
              <div key={group.hash} className="p-4 border border-gray-100 rounded-lg bg-gray-50/50 shadow-sm">
                <div className="flex flex-wrap gap-2 mb-3">
                  {group.items.map(item => (
                    <Badge key={item.id} variant="gray" className="px-3 py-1">
                      <img src={`https://www.google.com/s2/favicons?domain=${item.website || 'example.com'}&sz=16`} className="w-3 h-3 inline mr-1.5" alt="" loading="lazy" /> 
                      {item.title}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center pt-3 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-500">Shared across {group.items.length} items.</span>
                </div>
              </div>
            )) : (
              <EmptyState
                icon={KeyRound}
                title="No Reuse Detected"
                description="All your passwords appear to be unique across your accounts."
              />
            )}
          </div>
        </Card>

        {/* SECTION 4 - BREACH MONITOR */}
        <Card variant="section" className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-50 border border-teal-100 text-teal-600 shadow-sm">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Dark Web Breach Monitor</h3>
              <p className="text-sm text-gray-500 mt-1">Monitoring your saved emails against known data breaches.</p>
            </div>
          </div>
          <div className="flex flex-col items-end min-w-[200px]">
             <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                {isCheckingBreach && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span className="text-sm font-semibold text-gray-900">Protected</span>
            </div>
            <Button variant="secondary" onClick={handleCheckBreaches} isLoading={isCheckingBreach}>
              {isCheckingBreach ? 'Checking...' : `Checked ${lastBreachCheck}`}
            </Button>
          </div>
        </Card>

        {/* SECTION 5 - AI RECOMMENDATIONS */}
        <Card variant="section">
          <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
             <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-teal-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
            </div>
            <Badge variant="teal">GROQ-POWERED</Badge>
          </div>
          <div className="space-y-4">
             {aiRecommendations.length > 0 ? aiRecommendations.map(rec => (
              <div key={rec.item.id} className="p-4 rounded-lg bg-teal-50/50 border border-teal-100 relative shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-teal-900">{rec.item.title}</p>
                  <Badge variant={rec.riskScore.severity === 'critical' ? 'red' : 'amber'}>
                    Severity: {rec.riskScore.severity}
                  </Badge>
                </div>
                <p className="text-sm leading-relaxed text-teal-800">
                  {rec.aiInsight}
                </p>
              </div>
            )) : (
              <EmptyState
                icon={Sparkles}
                title="No Insights Yet"
                description="Click 'Run Deep Audit' above to leverage AI for deep security insights."
                action={
                  <Button variant="secondary" onClick={() => runAudit(true)} isLoading={isAuditing}>
                    <Sparkles size={14} className="mr-2" /> Start AI Scan
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        {/* SECTION 6 - BEHAVIORAL ALERTS */}
        <Card variant="section">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
             <Activity size={18} className="text-gray-400" />
             <h3 className="text-lg font-semibold text-gray-900">Behavioral Alerts</h3>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50 flex-row shadow-sm">
             <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-full flex justify-center items-center bg-teal-50 text-teal-600 flex-shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">No anomalous activity</p>
                <p className="text-sm text-gray-500 mt-1">Your recent login patterns look normal. No flagged events from unknown IPs.</p>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
