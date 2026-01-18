
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import MetricCard from './components/MetricCard';
import AdviceList from './components/AdviceList';
import { HealthMetrics, AIResponse, Tab, FoodLogEntry } from './types';
import { analyzeHealthData } from './services/geminiService';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [metrics, setMetrics] = useState<HealthMetrics>({
    systolic: 120,
    diastolic: 80,
    bloodSugar: 90,
    timestamp: new Date().toISOString()
  });
  
  const [analysis, setAnalysis] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState('');
  const [history, setHistory] = useState<HealthMetrics[]>([]);
  const [foodHistory, setFoodHistory] = useState<FoodLogEntry[]>([]);

  // Fetch initial data from Supabase
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await fetchLatestMetrics();
      await fetchHistory();
      setLoading(false);
    };
    initData();
  }, []);

  const fetchLatestMetrics = async () => {
    try {
      const { data, error: sbError } = await supabase
        .from('vitals')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (sbError) throw sbError;

      if (data && data.length > 0) {
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
      } else {
        await handleAnalyze();
      }
    } catch (err: any) {
      console.warn("Could not fetch latest metrics (vitals table may not exist yet):", err.message);
      // Don't set global error here to allow app to function without DB records
      await handleAnalyze(); 
    }
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

      if (query && result.foodAnalysis) {
        const { error: logError } = await supabase.from('food_logs').insert([{
          query,
          verdict: result.foodAnalysis.verdict,
          rating: result.foodAnalysis.rating,
          timestamp: new Date().toISOString()
        }]);
        
        if (!logError) {
          fetchHistory();
        }
        setActiveTab('coach');
      }
    } catch (err: any) {
      setError(`Coach error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveVitalsToSupabase = async () => {
    // Validation: Prevent empty values
    if (metrics.systolic === '' || metrics.diastolic === '' || metrics.bloodSugar === '') {
      setError('Please fill in all health metrics with numbers before saving.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        systolic: Number(metrics.systolic),
        diastolic: Number(metrics.diastolic),
        blood_sugar: Number(metrics.bloodSugar),
        timestamp: new Date().toISOString()
      };

      const { error: sbError } = await supabase.from('vitals').insert([payload]);

      if (sbError) {
        // Provide clear feedback if table doesn't exist or RLS blocks it
        if (sbError.code === '42P01') {
          throw new Error("The 'vitals' table does not exist in your Supabase database. Please create it with columns: systolic (int), diastolic (int), blood_sugar (int), and timestamp (timestamptz).");
        }
        throw sbError;
      }
      
      await handleAnalyze();
      await fetchHistory();
    } catch (err: any) {
      setError(`Save failed: ${err.message || 'Cloud storage unavailable'}`);
      console.error("Supabase Save Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMetricChange = (field: keyof HealthMetrics, value: string) => {
    const numValue = value === '' ? '' : parseInt(value);
    setMetrics(prev => ({ ...prev, [field]: numValue }));
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Current Vitals</h2>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded">Cloud Sync Active</span>
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

      <section className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
        <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Coach's Summary
        </h3>
        <p className="text-sm text-emerald-700 leading-relaxed">
          {loading ? 'Consulting the cloud...' : (analysis?.overallSummary || 'Update your metrics to see your current status.')}
        </p>
      </section>

      {analysis && (
        <section className="space-y-4">
          <AdviceList title="Recommended Diet" items={analysis.dietRecommendations} type="diet" />
          <AdviceList title="Lifestyle Changes" items={analysis.lifestyleTips} type="lifestyle" />
        </section>
      )}
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-6">Log New Metrics</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Blood Pressure (Systolic / Diastolic)</label>
            <div className="flex gap-4 items-center">
              <input 
                type="number" 
                value={metrics.systolic} 
                onChange={(e) => handleMetricChange('systolic', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="120"
              />
              <span className="text-gray-300 text-xl">/</span>
              <input 
                type="number" 
                value={metrics.diastolic} 
                onChange={(e) => handleMetricChange('diastolic', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="80"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Blood Sugar (mg/dL)</label>
            <input 
              type="number" 
              value={metrics.bloodSugar} 
              onChange={(e) => handleMetricChange('bloodSugar', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="90"
            />
          </div>

          <button 
            disabled={loading}
            onClick={saveVitalsToSupabase}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex justify-center items-center disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : 'Save to History & Analyze'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Recent History
        </h3>
        <div className="space-y-3">
          {history.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No historical records yet.</p>
          ) : history.map((h, i) => (
            <div key={h.id || i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div className="text-xs text-gray-500">
                {new Date(h.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex gap-4 text-xs font-medium text-gray-700">
                <span>{h.systolic}/{h.diastolic} BP</span>
                <span>{h.bloodSugar} Sugar</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCoach = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Ask your Coach</h2>
        <p className="text-sm text-gray-500 mb-6">Describe a meal, and I'll evaluate it and save it to your Supabase log.</p>
        
        <textarea 
          value={foodQuery}
          onChange={(e) => setFoodQuery(e.target.value)}
          placeholder="e.g., 'A bowl of oatmeal with blueberries and almond butter.'"
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none mb-4"
        />

        <button 
          disabled={loading || !foodQuery.trim()}
          onClick={() => handleAnalyze(foodQuery)}
          className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex justify-center items-center disabled:opacity-50"
        >
          {loading ? (
             <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : 'Evaluate & Log Meal'}
        </button>
      </div>

      {analysis?.foodAnalysis && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Meal Evaluation</h3>
              <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-sm">
                <span className="font-bold">{analysis.foodAnalysis.rating}</span>/10
              </div>
            </div>
            <p className="text-emerald-50 leading-relaxed text-sm">
              {analysis.foodAnalysis.verdict}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
              <h4 className="text-green-700 font-bold text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                Benefits (Pros)
              </h4>
              <ul className="space-y-2">
                {analysis.foodAnalysis.pros.map((pro, i) => (
                  <li key={i} className="text-xs text-green-800 flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 bg-green-400 rounded-full shrink-0" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
              <h4 className="text-red-700 font-bold text-sm mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                Concerns (Cons)
              </h4>
              <ul className="space-y-2">
                {analysis.foodAnalysis.cons.map((con, i) => (
                  <li key={i} className="text-xs text-red-800 flex items-start gap-2">
                    <span className="mt-1 w-1 h-1 bg-red-400 rounded-full shrink-0" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {foodHistory.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Meal History</h3>
          <div className="space-y-4">
            {foodHistory.map((log) => (
              <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Rating: {log.rating}/10</span>
                  <span className="text-[10px] text-gray-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 line-clamp-1 italic">"{log.query}"</p>
                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{log.verdict}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout activeTab={activeTab === 'history' ? 'logs' : activeTab} setActiveTab={setActiveTab}>
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-2 animate-in slide-in-from-top duration-300">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div className="flex-1">
            <p className="font-bold">Sync Error</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'logs' && renderLogs()}
      {activeTab === 'coach' && renderCoach()}

      <div className="mt-8 text-center">
        <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto leading-tight italic">
          Securely powered by Supabase & Gemini AI. This data is for informational purposes only.
        </p>
      </div>
    </Layout>
  );
};

export default App;
