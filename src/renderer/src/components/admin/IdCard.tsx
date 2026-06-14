import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Logo from '../Logo';
import HeritageMotif from '../HeritageMotif';
import type { AnyRecord, IndividualRecord, FamilyRecord } from '../../lib/adminApi';
import { displayName, photoUrl, initials, titleCase, formatDate, formatDateTime, verifyUrl } from '../../lib/recordHelpers';

// ID-1 proportions (85.6 × 54 mm → 1.585:1), rendered at a crisp on-screen size.
export const ID_CARD_W = 480;
export const ID_CARD_H = 303;

// Fixed heritage palette — the card must look identical in light/dark and when
// printed or exported, so it never uses the theme CSS variables.
const C = {
  forestDeep: 'oklch(29% 0.068 156)',
  forest: 'oklch(37% 0.085 156)',
  paper: 'oklch(96.5% 0.014 88)',
  paper2: 'oklch(92.5% 0.020 84)',
  accent: 'oklch(73% 0.135 80)',
  accentDeep: 'oklch(63% 0.130 72)',
  ink: 'oklch(24% 0.022 150)',
  ink2: 'oklch(41% 0.020 145)',
  onForest: 'oklch(96% 0.018 90)',
  onForest2: 'oklch(84% 0.030 100)',
  ruleForest: 'oklch(48% 0.045 156)',
};

const mono = '"JetBrains Mono", ui-monospace, monospace';
const display = '"Fraunces", ui-serif, Georgia, serif';
const sans = '"Hanken Grotesk", ui-sans-serif, system-ui, sans-serif';

const cardBase: React.CSSProperties = {
  width: ID_CARD_W,
  height: ID_CARD_H,
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 16,
  fontFamily: sans,
  boxShadow: '0 1px 2px oklch(0% 0 0 / 0.18)',
};

const Eyebrow: React.FC<{ children: React.ReactNode; color: string; style?: React.CSSProperties }> = ({ children, color, style }) => (
  <span style={{ fontFamily: mono, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color, ...style }}>
    {children}
  </span>
);

const Photo: React.FC<{ record: AnyRecord; size: number }> = ({ record, size }) => {
  const url = photoUrl(record);
  const name = displayName(record);
  return (
    <div
      style={{
        width: size,
        height: size * 1.25,
        borderRadius: 8,
        overflow: 'hidden',
        background: C.paper2,
        border: `2px solid ${C.accent}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <img
          src={url}
          crossOrigin="anonymous"
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ fontFamily: display, fontSize: size * 0.4, color: C.ink2 }}>{initials(name)}</span>
      )}
    </div>
  );
};

/** Two compact key fields shown on the card front. */
function frontFields(record: AnyRecord): { label: string; value: string }[] {
  if (record.type === 'individual') {
    const r = record as IndividualRecord;
    return [
      { label: 'LGA of residence', value: titleCase(r.lga_of_residence) },
      { label: 'Gender', value: titleCase(r.gender) },
    ];
  }
  const r = record as FamilyRecord;
  return [
    { label: 'LGA of residence', value: titleCase(r.lga_of_residence) },
    { label: 'Household size', value: r.household_size || '—' },
  ];
}

function backFields(record: AnyRecord): { label: string; value: string }[] {
  if (record.type === 'individual') {
    const r = record as IndividualRecord;
    return [
      { label: 'NIN', value: r.nin || '—' },
      { label: 'Date of birth', value: formatDate(r.date_of_birth) },
      { label: 'Phone', value: r.phone_number || '—' },
      { label: 'State of residence', value: titleCase(r.state_of_residence) },
    ];
  }
  const r = record as FamilyRecord;
  return [
    { label: 'Head of household', value: titleCase(r.household_head_name) },
    { label: 'Household size', value: r.household_size || '—' },
    { label: 'Phone', value: r.phone_number || '—' },
    { label: 'State of residence', value: titleCase(r.state_of_residence) },
  ];
}

export const IdCardFront: React.FC<{ record: AnyRecord }> = ({ record }) => {
  const name = displayName(record);
  const typeLabel = record.type === 'individual' ? 'Member card' : 'Household card';
  return (
    <div className="id-card" data-side="front" style={{ ...cardBase, background: C.forestDeep, color: C.onForest }}>
      <span style={{ position: 'absolute', insetInline: 0, top: 0, height: 5, background: C.accent }} />
      <HeritageMotif
        className="pointer-events-none absolute right-[-70px] top-[-50px] w-[280px] h-[280px] opacity-10"
        stroke={C.onForest}
      />
      <div style={{ position: 'relative', height: '100%', padding: 20, display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo size="sm" />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontFamily: display, fontSize: 18, color: C.onForest }}>PLYSS</div>
              <Eyebrow color={C.onForest2} style={{ fontSize: 7 }}>Plateau Yoruba Statistical Survey</Eyebrow>
            </div>
          </div>
          <Eyebrow color={C.accent}>{typeLabel}</Eyebrow>
        </div>

        {/* body */}
        <div style={{ display: 'flex', gap: 16, marginTop: 18, flex: 1 }}>
          <Photo record={record} size={92} />
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Eyebrow color={C.onForest2}>{record.type === 'individual' ? 'Full name' : 'Head of household'}</Eyebrow>
            <div style={{ fontFamily: display, fontSize: 22, lineHeight: 1.1, color: C.onForest, marginTop: 3, overflowWrap: 'anywhere' }}>
              {name}
            </div>

            <div style={{ marginTop: 12 }}>
              <Eyebrow color={C.onForest2}>PLYSS ID</Eyebrow>
              <div style={{ fontFamily: mono, fontSize: 17, letterSpacing: '0.08em', color: C.accent, marginTop: 2 }}>
                {record.plyss_id || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18, marginTop: 'auto' }}>
              {frontFields(record).map((f) => (
                <div key={f.label} style={{ minWidth: 0 }}>
                  <Eyebrow color={C.onForest2}>{f.label}</Eyebrow>
                  <div style={{ fontSize: 12, color: C.onForest, marginTop: 2, overflowWrap: 'anywhere' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 9,
            borderTop: `1px solid ${C.ruleForest}`,
          }}
        >
          <Eyebrow color={C.onForest2}>Issued&nbsp;&nbsp;{formatDateTime(record.created_at)}</Eyebrow>
          <Eyebrow color={C.onForest2}>Plateau&nbsp;State&nbsp;·&nbsp;Nigeria</Eyebrow>
        </div>
      </div>
    </div>
  );
};

export const IdCardBack: React.FC<{ record: AnyRecord }> = ({ record }) => {
  return (
    <div className="id-card" data-side="back" style={{ ...cardBase, background: C.paper, color: C.ink }}>
      <span style={{ position: 'absolute', insetInline: 0, top: 0, height: 5, background: C.accent }} />
      <div style={{ position: 'relative', height: '100%', padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: 18, flex: 1 }}>
          {/* QR */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ padding: 8, background: '#fff', borderRadius: 8, border: `1px solid ${C.paper2}` }}>
              <QRCodeSVG value={verifyUrl(record.plyss_id, record.verify_token)} size={92} level="M" fgColor={C.forestDeep} bgColor="transparent" />
            </div>
            <Eyebrow color={C.ink2}>Scan to verify</Eyebrow>
          </div>

          {/* fields */}
          <div style={{ minWidth: 0, flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', alignContent: 'start' }}>
            {backFields(record).map((f) => (
              <div key={f.label} style={{ minWidth: 0 }}>
                <Eyebrow color={C.ink2}>{f.label}</Eyebrow>
                <div style={{ fontSize: 12, color: C.ink, marginTop: 2, overflowWrap: 'anywhere' }}>{f.value}</div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
              <Eyebrow color={C.ink2}>Holder’s signature</Eyebrow>
              <div style={{ borderBottom: `1px solid ${C.ink2}`, height: 22 }} />
            </div>
          </div>
        </div>

        {/* notice */}
        <p style={{ fontSize: 8.5, lineHeight: 1.45, color: C.ink2, marginTop: 10 }}>
          This card remains the property of the Plateau Yoruba Statistical Survey. It certifies inclusion in the
          survey record only. If found, please return to info@plyss.ng.
        </p>
        <div
          style={{
            marginTop: 8,
            background: C.forest,
            color: C.onForest,
            borderRadius: 8,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Eyebrow color={C.onForest}>PLYSS</Eyebrow>
          <Eyebrow color={C.onForest2}>plyss.ng</Eyebrow>
        </div>
      </div>
    </div>
  );
};

/** Front + back together — used by the printable / exportable ID card page. */
const IdCard: React.FC<{ record: AnyRecord }> = ({ record }) => (
  <div className="id-card-set" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
    <IdCardFront record={record} />
    <IdCardBack record={record} />
  </div>
);

export default IdCard;
