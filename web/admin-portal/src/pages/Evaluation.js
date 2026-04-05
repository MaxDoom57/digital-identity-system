import React, { useState, useEffect } from 'react';
import API from '../api';
import { theme } from '../styles/theme';
import { Activity, Zap, Shield, CheckCircle, Camera, Fingerprint, Layers } from 'lucide-react';

export default function Evaluation() {
    const [systemStatus, setSystemStatus] = useState(null);
    const [latencyResult, setLatencyResult] = useState(null);
    const [throughputResult, setThroughputResult] = useState(null);
    const [biometricMetrics, setBiometricMetrics] = useState(null);
    const [loading, setLoading] = useState({});

    useEffect(() => { loadSystemStatus(); loadBiometricMetrics(); }, []);

    const loadSystemStatus = async () => {
        try {
            const res = await API.get('/api/evaluation/system-status');
            setSystemStatus(res.data.status);
        } catch { }
    };

    const loadBiometricMetrics = async () => {
        try {
            const res = await API.get('/api/evaluation/biometric-metrics');
            setBiometricMetrics(res.data.metrics);
        } catch { }
    };

    const runLatencyTest = async () => {
        setLoading(l => ({ ...l, latency: true }));
        try {
            const res = await API.get('/api/evaluation/latency?iterations=10');
            setLatencyResult(res.data);
        } catch (err) {
            console.error(err);
        } finally { setLoading(l => ({ ...l, latency: false })); }
    };

    const runThroughputTest = async () => {
        setLoading(l => ({ ...l, throughput: true }));
        try {
            const res = await API.post('/api/evaluation/throughput', { count: 5 });
            setThroughputResult(res.data);
        } catch (err) {
            console.error(err);
        } finally { setLoading(l => ({ ...l, throughput: false })); }
    };

    const cardStyle = { background: theme.bgCard, borderRadius: 12, padding: 24, border: `1px solid ${theme.border}`, marginBottom: 20 };

    return (
        <div>
            <h1 style={{
                fontSize: 28, fontWeight: 'bold', color: theme.textPrimary, marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 12
            }}><Activity size={28} />System Evaluation</h1>
            <p style={{ color: theme.textSecondary, marginBottom: 32 }}>Performance metrics and test results for research evaluation</p>

            {/* System Status */}
            <div style={cardStyle}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={20} color="#059669" />System Status
                </h2>
                {systemStatus ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                        {Object.entries(systemStatus).map(([key, val]) => {
                            const displayVal = typeof val === 'object' && val !== null
                                ? (val.status || Object.values(val).join(', '))
                                : val;
                            const isGood = displayVal === 'online' || displayVal === 'deployed' ||
                                (typeof displayVal === 'string' && displayVal.includes('deployed'));
                            return (
                                <div key={key} style={{ background: theme.bg, borderRadius: 8, padding: 12, textAlign: 'center', border: `1px solid ${theme.borderLight}` }}>
                                    <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4, textTransform: 'uppercase' }}>{key}</div>
                                    <div style={{ fontWeight: 600, color: isGood ? theme.success : theme.danger, fontSize: 13 }}>
                                        {String(displayVal)}
                                    </div>
                                    {val?.latencyMs && <div style={{ fontSize: 11, color: theme.textSecondary }}>{val.latencyMs}ms</div>}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ color: theme.textSecondary }}>Loading system status...</div>
                )}
            </div>

            {/* Latency Test */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={20} color="#f59e0b" />Blockchain Query Latency
                    </h2>
                    <button onClick={runLatencyTest} disabled={loading.latency}
                        style={{
                            background: '#2563eb', color: 'white', padding: '8px 16px', borderRadius: 8,
                            border: 'none', cursor: 'pointer', fontWeight: 500
                        }}>
                        {loading.latency ? 'Testing...' : 'Run Test (10 queries)'}
                    </button>
                </div>
                {latencyResult ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                        {[
                            { label: 'Average', value: `${latencyResult.avgLatencyMs}ms`, color: theme.accent },
                            { label: 'Minimum', value: `${latencyResult.minLatencyMs}ms`, color: theme.success },
                            { label: 'Maximum', value: `${latencyResult.maxLatencyMs}ms`, color: theme.danger },
                            { label: 'Iterations', value: latencyResult.iterations, color: '#7c3aed' },
                        ].map(item => (
                            <div key={item.label} style={{ background: theme.bg, borderRadius: 8, padding: 16, textAlign: 'center', border: `1px solid ${theme.borderLight}` }}>
                                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>{item.label}</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: item.color }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: theme.textSecondary, fontSize: 14 }}>Click "Run Test" to measure blockchain query latency</p>
                )}
            </div>

            {/* Throughput Test */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={20} color="#7c3aed" />Transaction Throughput
                    </h2>
                    <button onClick={runThroughputTest} disabled={loading.throughput}
                        style={{
                            background: '#7c3aed', color: 'white', padding: '8px 16px', borderRadius: 8,
                            border: 'none', cursor: 'pointer', fontWeight: 500
                        }}>
                        {loading.throughput ? 'Testing...' : 'Run Test (5 transactions)'}
                    </button>
                </div>
                {throughputResult ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                        {[
                            { label: 'TPS', value: throughputResult.tps, color: '#7c3aed' },
                            { label: 'Successful', value: throughputResult.successful, color: theme.success },
                            { label: 'Avg Latency', value: `${throughputResult.avgLatencyMs}ms`, color: theme.accent },
                            { label: 'Total Time', value: `${throughputResult.totalTimeMs}ms`, color: theme.warning },
                        ].map(item => (
                            <div key={item.label} style={{ background: theme.bg, borderRadius: 8, padding: 16, textAlign: 'center', border: `1px solid ${theme.borderLight}` }}>
                                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>{item.label}</div>
                                <div style={{ fontSize: 24, fontWeight: 'bold', color: item.color }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: theme.textSecondary, fontSize: 14 }}>Click "Run Test" to measure transaction throughput</p>
                )}
            </div>

            {/* Biometric Metrics */}
            {biometricMetrics && (
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={20} color="#059669" />Biometric Performance Metrics
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                        {Object.entries(biometricMetrics).map(([mode, metrics]) => (
                            <div key={mode} style={{ border: `1px solid ${theme.border}`, borderRadius: 8, padding: 16, background: theme.bg }}>
                                <div style={{ fontWeight: 600, color: theme.textPrimary, marginBottom: 12, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {mode === 'multimodal' ? <><Layers size={16} color={theme.accent} /> Multimodal (Fusion)</> : mode === 'face' ? <><Camera size={16} color={theme.accent} /> Face Recognition</> : <><Fingerprint size={16} color={theme.accent} /> Fingerprint</>}
                                </div>
                                {[
                                    { label: 'FAR', value: `${(metrics.FAR * 100).toFixed(3)}%`, desc: 'False Acceptance Rate' },
                                    { label: 'FRR', value: `${(metrics.FRR * 100).toFixed(3)}%`, desc: 'False Rejection Rate' },
                                    { label: 'EER', value: `${(metrics.EER * 100).toFixed(3)}%`, desc: 'Equal Error Rate' },
                                    { label: 'Accuracy', value: `${metrics.accuracy}%`, desc: 'Overall Accuracy' },
                                ].map(item => (
                                    <div key={item.label} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 0', borderBottom: `1px solid ${theme.borderLight}`, fontSize: 13
                                    }}>
                                        <span style={{ color: theme.textSecondary }}>{item.desc}</span>
                                        <span style={{ fontWeight: 600, color: theme.textPrimary }}>{item.value}</span>
                                    </div>
                                ))}
                                {metrics.note && (
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#059669', fontStyle: 'italic' }}>{metrics.note}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
