import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield, AlertTriangle, KeyRound, Clock, CheckCircle, RefreshCw, Sparkles, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { SecurityRing } from '../components/vault/VaultHelpers';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PasswordItem } from '../types/vault';
import { runFullAudit, AuditedItem } from '../features/ai/securityAuditAI';

export function SecurityAudit() {
  const { items } = useVault();
  const navigate = useNavigate();

  const [auditedItems, setAuditedItems] = useState<AuditedItem[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    // Run local fast audit on load
    runAudit(false);
  }, [items]);

  const runAudit = async (withAI: boolean) => {
    setIsAuditing(true);
    const passwords = items.filter(i => i.type === 'password') as PasswordItem[];
    const results = await runFullAudit(passwords, { includeAI: withAI });
    setAuditedItems(results);
    setIsAuditing(false);
  };

  // Aggregate stats
  const critical = auditedItems.filter(a => a.riskScore.severity === 'critical');
  const high = auditedItems.filter(a => a.riskScore.severity === 'high');
  const medium = auditedItems.filter(a => a.riskScore.severity === 'medium');
  const low = auditedItems.filter(a => a.riskScore.severity === 'low');

  const totalScore = auditedItems.length > 0
    ? Math.round(
        auditedItems.reduce((acc, curr) => acc + (100 - curr.riskScore.total), 0) / auditedItems.length
      )
    : 100;

  const hasAIInsights = auditedItems.some(a => !!a.aiInsight);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-4xl mx-auto space-y-8 h-full overflow-y-auto scrollbar-hidden">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-vault-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-vault-gray-950 tracking-tight flex items-center gap-3">
            <Shield size={28} className="text-vault-primary-600" strokeWidth={2.5} /> Security Audit
          </h2>
          <p className="text-sm text-vault-gray-500 mt-1">Comprehensive intelligence-driven analysis of your vault health.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={() => runAudit(false)} disabled={isAuditing} icon={isAuditing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}>
            Local Scan
          </Button>
          <Button variant="primary" size="md" onClick={() => runAudit(true)} disabled={isAuditing || hasAIInsights} icon={<Sparkles size={16} />}>
            {hasAIInsights ? 'AI Scan Complete' : 'Deep AI Audit'}
          </Button>
        </div>
      </div>

      {/* Health overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="vault-card p-6 bg-white flex flex-col items-center justify-center text-center col-span-1">
          <SecurityRing score={totalScore} size={140} strokeWidth={12} label="Health" />
          <p className="text-sm font-bold text-vault-gray-900 mt-4">Vault Security Score</p>
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="vault-card p-4 bg-white">
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Critical Risks</p>
            <p className="text-3xl font-bold text-vault-gray-900">{critical.length}</p>
            <div className="w-full bg-red-100 h-1 rounded-full mt-3">
                <div className="bg-red-500 h-1 rounded-full" style={{ width: `${(critical.length / Math.max(auditedItems.length, 1)) * 100}%` }} />
            </div>
          </div>
          <div className="vault-card p-4 bg-white">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">High Risks</p>
            <p className="text-3xl font-bold text-vault-gray-900">{high.length}</p>
            <div className="w-full bg-amber-100 h-1 rounded-full mt-3">
                <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${(high.length / Math.max(auditedItems.length, 1)) * 100}%` }} />
            </div>
          </div>
          <div className="vault-card p-4 bg-white">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Medium Risks</p>
            <p className="text-3xl font-bold text-vault-gray-900">{medium.length}</p>
             <div className="w-full bg-blue-100 h-1 rounded-full mt-3">
                <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${(medium.length / Math.max(auditedItems.length, 1)) * 100}%` }} />
            </div>
          </div>
          <div className="vault-card p-4 bg-white">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Healthy</p>
            <p className="text-3xl font-bold text-vault-gray-900">{low.length}</p>
            <div className="w-full bg-emerald-100 h-1 rounded-full mt-3">
                <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${(low.length / Math.max(auditedItems.length, 1)) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Risk Items */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-bold text-vault-gray-400 uppercase tracking-widest">
            Detailed Breakdown ({critical.length + high.length} Action Required)
          </h3>
          {isAuditing && <span className="text-vault-primary-600 text-[10px] font-bold uppercase flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> AI Engine Processing...</span>}
        </div>
        
        {auditedItems.filter(a => a.riskScore.severity === 'critical' || a.riskScore.severity === 'high').map((audited, i) => (
          <motion.div
            key={audited.item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`vault-card bg-white p-5 transition-all border-l-4 ${
              audited.riskScore.severity === 'critical' ? 'border-l-red-600' : 'border-l-amber-500'
            } ${expandedItemId === audited.item.id ? 'shadow-xl shadow-vault-gray-200' : ''}`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                audited.riskScore.severity === 'critical' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600'
              }`}>
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-base font-bold text-vault-gray-900">{audited.item.title}</p>
                  <Badge variant={audited.riskScore.severity === 'critical' ? 'danger' : 'warning'}>
                    Risk {audited.riskScore.total}
                  </Badge>
                  {audited.aiInsight && (
                    <Badge variant="teal">
                      <Sparkles size={10} className="mr-1 inline" /> Intelligence
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-semibold text-vault-gray-400 truncate mb-3">{audited.item.website || audited.item.username}</p>
                
                {/* Risk Factors */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {audited.riskScore.factors.reuse > 0 && (
                    <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-100 uppercase tracking-tighter">
                      Reused
                    </span>
                  )}
                  {audited.riskScore.factors.age > 0 && (
                    <span className="text-[10px] bg-vault-gray-100 text-vault-gray-600 px-2 py-0.5 rounded-full font-bold border border-vault-gray-200 uppercase tracking-tighter">
                      Old
                    </span>
                  )}
                  {audited.riskScore.factors.entropy > 40 && (
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-100 uppercase tracking-tighter">
                      Weak
                    </span>
                  )}
                </div>
                
                <AnimatePresence>
                  {audited.aiInsight && expandedItemId === audited.item.id && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-vault-primary-50 border border-vault-primary-100 mb-4 relative">
                        <div className="flex items-center gap-2 text-vault-primary-700 font-bold text-[10px] uppercase tracking-widest mb-2">
                          <Sparkles size={14} strokeWidth={2.5}/> AI Security Recommendations
                        </div>
                        <p className="text-xs text-vault-primary-900 leading-relaxed font-medium">
                          {audited.aiInsight}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-4">
                   <button 
                    onClick={() => navigate(`/item/${audited.item.id}`)}
                    className="text-xs font-bold text-vault-primary-600 hover:text-vault-primary-500 transition-colors py-1 cursor-pointer"
                  >
                    Change Password
                  </button>
                  {audited.aiInsight && (
                    <button 
                      onClick={() => setExpandedItemId(expandedItemId === audited.item.id ? null : audited.item.id)}
                      className="text-xs font-bold text-vault-gray-400 hover:text-vault-gray-600 flex items-center gap-1 transition-colors group cursor-pointer"
                    >
                      {expandedItemId === audited.item.id ? 'Hide Insight' : 'View Deep Insight'}
                      <ChevronDown size={14} className={`transition-transform duration-200 ${expandedItemId === audited.item.id ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {critical.length === 0 && high.length === 0 && (
          <div className="vault-card p-16 bg-white text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-sm shadow-emerald-100">
              <CheckCircle size={40} strokeWidth={2.5} />
            </div>
            <h3 className="text-xl font-bold text-vault-gray-950 mb-2">Maximum Security Reached</h3>
            <p className="text-sm text-vault-gray-500 max-w-sm mx-auto leading-relaxed">No high-risk passwords or security vulnerabilities were detected in your current vault items.</p>
            <Button variant="outline" className="mt-8" onClick={() => navigate('/')}>Return to Dashboard</Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
