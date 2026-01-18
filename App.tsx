
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import MetricCard from './components/MetricCard';
import AdviceList from './components/AdviceList';
import { HealthMetrics, AIResponse, Tab, FoodLogEntry } from './types';
import { analyzeHealthData } from './services/geminiService';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'local' | 'error'>('cloud');
  const [metrics, setMetrics] = useState<HealthMetrics>({ 
    systolic: 120, 
    diastolic: 80, 
    bloodSugar: 90, 
    timestamp: new Date().toISOString() 
  });
  
  const [analysis, setAnalysis] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState('');
  const [history, setHistory] = useState<HealthMetrics[]>([]);
  const [foodHistory, setFoodHistory] = useState<FoodLogEntry[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLatestMetrics();
      fetchHistory();
    }
  }, [user]);

  const fetchLatestMetrics = async () => {
    setLoading(true);
    try {
      const { data, error: sbError } = await supabase
        .from('vitals')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (sbError) {
        console.warn("Supabase Fetch Error:", sbError.message);
        setSyncStatus('local');
        loadLocalData();
      } else if (data && data.length > 0) {
        const latest = data[0];
        const newMetrics = {
          systolic: latest.systolic,
          diastolic: latest.diastolic,
          bloodSugar: latest.blood_sugar,
          timestamp: latest.timestamp
        };
        setMetrics(newMetrics);
        const result = await analyzeHealthData(newMetrics);
        setAnalysis(result);
        setSyncStatus('cloud');
      } else {
        handleAnalyze();
      }
    } catch (err) {
      setSyncStatus('local');
      loadLocalData();
      handleAnalyze();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    const local = localStorage.getItem('health_metrics_fallback');
    if (local) setMetrics(JSON.parse(local));
  };

  const fetchHistory = async () => {
    try {
      const { data: vitalsData, error: vError } = await supabase
        .from('vitals')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (!vError && vitalsData) {
        setHistory(vitalsData.map(v => ({
          id: v.id,
          systolic: v.systolic,
          diastolic: v.diastolic,
          bloodSugar: v.blood_sugar,
          timestamp: v.timestamp
        })));
      }

      const { data: foodData, error: fError } = await supabase
        .from('food_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (!fError && foodData) {
        setFoodHistory(foodData);
      }
    } catch (err) {
      console.warn("History fetch failed:", err);
    }
  };

  const handleAnalyze = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeHealthData(metrics, query);
      setAnalysis(result);

      if (query && result.foodAnalysis && user) {
        try {
          await supabase.from('food_logs').insert([{
            user_id: user.id,
            query,
            verdict: result.foodAnalysis.verdict,
            rating: result.foodAnalysis.rating,
            timestamp: new Date().toISOString()
          }]);
          fetchHistory();
        } catch (e) {
          console.warn("Cloud log failed, sticking to local analysis UI");
        }
        setActiveTab('coach');
      }
    } catch (err: any) {
      setError(`Coach error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveVitals = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    
    // Always save locally first
    localStorage.setItem('health_metrics_fallback', JSON.stringify(metrics));
    
    try {
      const { error: sbError } = await supabase.from('vitals').insert([{
        user_id: user.id,
        systolic: Number(metrics.systolic),
        diastolic: Number(metrics.diastolic),
        blood_sugar: Number(metrics.bloodSugar),
        timestamp: new Date().toISOString()
      }]);

      if (sbError) throw sbError;
      setSyncStatus('cloud');
      await handleAnalyze();
      await fetchHistory();
      setActiveTab('dashboard');
    } catch (err: any) {
      console.warn("Cloud save failed (using local fallback):", err.message);
      setSyncStatus('local');
      await handleAnalyze();
      setActiveTab('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => await supabase.auth.signOut();

  if (!user) return <Auth onAuthSuccess={() => {}} />;

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Current Vitals</h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'cloud' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {syncStatus === 'cloud' ? 'Cloud Sync active' : 'Local Mode'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard 
            title="Blood Pressure" 
            value={`${metrics.systolic || '-'}/${metrics.diastolic || '-'}`} 
            unit="mmHg" 
            status={analysis?.bpStatus}
            icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>}
          />
          <MetricCard 
            title="Blood Sugar" 
            value={metrics.bloodSugar?.toString() || '-'} 
            unit="mg/dL" 
            status={analysis?.sugarStatus}
            icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM11 2a1 1 0 011-1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 10a1 1 0 011-1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" clipRule="evenodd" /></svg>}
          />
        </div>
      </section>

      <section className="bg-sky-50 rounded-2xl p-5 border border-sky-100">
        <h3 className="text-[#2490D1] font-bold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Coach's Summary
        </h3>
        <p className="text-sm text-sky-800 leading-relaxed italic">
          {loading ? 'Consulting the cloud...' : (analysis?.overallSummary || 'Update your metrics to see your current status.')}
        </p>
      </section>

      {analysis && (
        <div className="space-y-4">
          <AdviceList title="Recommended Diet" items={analysis.dietRecommendations} type="diet" />
          <AdviceList title="Lifestyle Changes" items={analysis.lifestyleTips} type="lifestyle" />
        </div>
      )}
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-500">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Log New Metrics</h2>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Systolic</label>
              <input 
                type="number" 
                value={metrics.systolic} 
                onChange={(e) => setMetrics({...metrics, systolic: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2490D1] transition-all"
                placeholder="120"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Diastolic</label>
              <input 
                type="number" 
                value={metrics.diastolic} 
                onChange={(e) => setMetrics({...metrics, diastolic: Number(e.target.value)})}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2490D1] transition-all"
                placeholder="80"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Blood Sugar (mg/dL)</label>
            <input 
              type="number" 
              value={metrics.bloodSugar} 
              onChange={(e) => setMetrics({...metrics, bloodSugar: Number(e.target.value)})}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2490D1] transition-all"
              placeholder="90"
            />
          </div>
          <button 
            disabled={loading}
            onClick={saveVitals}
            className="w-full bg-[#2490D1] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#1a7bb5] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save to History'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#5BC6B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Recent History
        </h3>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No records yet.</p>
          ) : history.map((h, i) => (
            <div key={h.id || i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div className="text-[10px] text-gray-500">
                {new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-4 text-xs font-medium text-gray-700">
                <span className="text-[#2490D1] font-semibold">{h.systolic}/{h.diastolic} BP</span>
                <span className="text-[#5BC6B3] font-semibold">{h.bloodSugar} Sugar</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCoach = () => (
    <div className="space-y-6 animate-in slide-in-from-left duration-500">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Ask your Coach</h2>
        <p className="text-sm text-gray-500 mb-6">Describe a meal, and I'll evaluate it based on your metrics.</p>
        <textarea 
          value={foodQuery}
          onChange={(e) => setFoodQuery(e.target.value)}
          placeholder="e.g., 'A bowl of oatmeal with blueberries and almond butter.'"
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2490D1] h-32 resize-none mb-4"
        />
        <button 
          disabled={loading || !foodQuery.trim()}
          onClick={() => handleAnalyze(foodQuery)}
          className="w-full bg-[#2490D1] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#1a7bb5] transition-all flex justify-center items-center disabled:opacity-50"
        >
          {loading ? 'Evaluating...' : 'Evaluate Meal'}
        </button>
      </div>

      {analysis?.foodAnalysis && (
        <div className="bg-[#2490D1] text-white rounded-2xl p-6 shadow-md border-b-4 border-[#5BC6B3]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Evaluation</h3>
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
              <span className="font-bold">{analysis.foodAnalysis.rating}</span>/10
            </div>
          </div>
          <p className="text-sky-50 leading-relaxed text-sm italic">"{analysis.foodAnalysis.verdict}"</p>
        </div>
      )}
      
      <button 
        onClick={handleLogout}
        className="w-full py-4 text-[10px] font-black text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all uppercase tracking-[0.2em]"
      >
        Sign Out
      </button>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="flex justify-between items-center mb-8 px-2">
        <div className="flex flex-col">
          <span className="text-2xl font-black text-gray-900 tracking-tight leading-none">Hello,</span>
          <span className="text-2xl font-black text-[#2490D1] tracking-tight leading-tight">{displayName}!</span>
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-full border-2 border-white shadow-sm overflow-hidden">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt="avatar" />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs rounded-2xl border border-red-100 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}
      
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'logs' && renderLogs()}
      {activeTab === 'coach' && renderCoach()}
    </Layout>
  );
};

export default App;
