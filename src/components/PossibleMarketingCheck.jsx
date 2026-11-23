import React, { useEffect, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, ensureFirebaseAuth } from '../firebase/config';

const labels = { pending: 'Pendiente de Marketing', approved: 'Aprobado para seguimiento', rejected: 'Desaprobado por Marketing', closed: 'Seguimiento finalizado', withdrawn: 'Propuesta retirada' };
export default function PossibleMarketingCheck({ order }) {
    const [selected, setSelected] = useState(order.posibleMarketing === true);
    const [status, setStatus] = useState(order.marketingEstado || '');
    const [busy, setBusy] = useState(false), [error, setError] = useState('');
    useEffect(() => { setSelected(order.posibleMarketing === true); setStatus(order.marketingEstado || ''); setError(''); }, [order.id, order.posibleMarketing, order.marketingEstado]);
    const reviewed = ['approved', 'rejected', 'closed'].includes(status);
    const title = `Posible marketing${status ? ' · ' + (labels[status] || status) : ''}. Solo seguimiento de fotos o videos.`;
    async function toggle(value) {
        if (busy || reviewed) return;
        setBusy(true); setError('');
        try {
            await ensureFirebaseAuth();
            const call = httpsCallable(getFunctions(app, 'us-central1'), 'setPossibleMarketing');
            const result = await call({ databaseId: '(default)', orderId: String(order.id), selected: value,
                source: order.status, actor: order[order.status]?.operadorNombre || order[order.status]?.operador || 'Equipo de producción' });
            setSelected(result.data.selected); setStatus(result.data.status);
        } catch (e) { setError(e?.message || 'No se pudo guardar. Reintenta el check.'); }
        finally { setBusy(false); }
    }
    return <span className="relative inline-flex items-center ml-2" onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} disabled={busy || reviewed} onChange={e => void toggle(e.target.checked)}
            aria-label={title} title={error || title} className="w-4 h-4 accent-violet-600 cursor-pointer disabled:cursor-default" />
        {error && <span role="alert" className="absolute z-30 top-6 left-0 w-64 rounded border bg-white p-2 text-xs text-red-700 shadow">{error}<button type="button" className="ml-2 underline" onClick={() => setError('')}>Cerrar</button></span>}
    </span>;
}
