import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { ArrowLeft, Printer, Download, Loader2, AlertCircle, CreditCard as IdCardIcon } from 'lucide-react';
import IdCard from '../../components/admin/IdCard';
import { fetchRecord, ApiError, type SurveyType, type AnyRecord } from '../../lib/adminApi';
import { displayName } from '../../lib/recordHelpers';
import { useAuth } from '../../contexts/AuthContext';

const IdCardPage = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const surveyType = (type === 'family' ? 'family' : 'individual') as SurveyType;

  const [record, setRecord] = useState<AnyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<string | null>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetchRecord(surveyType, id ?? '');
        if (active) setRecord({ ...(r as object), type: surveyType } as AnyRecord);
      } catch (e) {
        if (!active) return;
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          logout();
          navigate('/admin/login', { replace: true });
          return;
        }
        setError(e instanceof Error ? e.message : 'Could not load this record.');
      }
    })();
    return () => { active = false; };
  }, [surveyType, id, logout, navigate]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!cardsRef.current || !record) return;
    setExporting(true);
    setExportNote(null);
    try {
      const dataUrl = await toPng(cardsRef.current, { pixelRatio: 3, cacheBust: true, backgroundColor: 'transparent' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `PLYSS-${record.plyss_id || record.id}.png`;
      a.click();
    } catch {
      setExportNote('PNG export was blocked (often the photo’s cross-origin policy). Use “Print / Save as PDF” instead — it always works.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Toolbar — hidden when printing */}
      <header className="no-print focus-on-dark bg-forest-deep text-on-forest">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/admin/records" className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-on-forest-2 hover:text-on-forest transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to records
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={handleDownload} disabled={!record || exporting} className="chip chip--on-forest disabled:opacity-60">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PNG
            </button>
            <button onClick={handlePrint} disabled={!record} className="chip chip--solid disabled:opacity-60">
              <Printer className="w-4 h-4" /> Print / Save as PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 lg:px-8 py-10 sm:py-14">
        {!record && !error && (
          <div className="flex items-center justify-center gap-2 text-muted py-24">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading record…
          </div>
        )}

        {error && (
          <div role="alert" className="no-print max-w-md mx-auto mt-10 flex items-start gap-2.5 rounded border border-danger bg-paper-2 px-4 py-3 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} />
            <span>{error}</span>
          </div>
        )}

        {record && (
          <>
            <div className="no-print mb-8">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted flex items-center gap-2">
                <IdCardIcon className="w-4 h-4" /> Identity card
              </p>
              <h1 className="mt-2 font-display font-light text-3xl sm:text-4xl text-ink leading-[1.05]">
                {displayName(record)}
              </h1>
              <p className="mt-2 font-mono text-sm text-accent-deep">{record.plyss_id || '—'}</p>
            </div>

            <div ref={cardsRef} className="id-card-print-area">
              <IdCard record={record} />
            </div>

            {exportNote && (
              <p className="no-print mt-6 max-w-prose text-sm text-muted leading-relaxed">{exportNote}</p>
            )}
            <p className="no-print mt-8 max-w-prose text-xs text-muted leading-relaxed">
              Tip: in the print dialog choose “Save as PDF”, set margins to default and enable background graphics for the
              full-colour card. The card is printed at ID-card proportions (front and back).
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default IdCardPage;
