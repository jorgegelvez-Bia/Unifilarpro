import { useState } from 'react';
import { useStore } from '@/store/diagram';
import { schedule, sendLogin, signOut, useCloud, verifyCode } from '@/sync';

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'hace un momento' : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.round(s / 3600)} h`;
};

/** Aviso corto del estado del guardado (va en la cabecera). */
export function CloudChip() {
  const { status } = useCloud();
  const pend = useStore((s) => s.sync.dirty.length);
  const [txt, cls] =
    status === 'local' ? ['Guardado en el celular', 'border-line text-muted']
    : status === 'out' ? ['Sin sesión · guardado en el celular', 'border-line text-muted']
    : status === 'syncing' ? ['Sincronizando…', 'border-accent text-accent']
    : status === 'offline' ? [`Sin internet${pend ? ` · ${pend} por subir` : ''}`, 'border-volt text-volt']
    : status === 'error' ? ['No se pudo sincronizar', 'border-bad text-bad']
    : pend ? [`${pend} por subir`, 'border-volt text-volt'] : ['✔ Sincronizado', 'border-accent text-accent'];
  return <span role="status" className={`rounded-full border px-2.5 py-1 font-mono text-xs ${cls}`}>{txt}</span>;
}

/** "Tu cuenta": entrar con el correo (enlace o código), ver el estado y salir. */
export function CloudPanel() {
  const { status, email, lastSync, error } = useCloud();
  const pend = useStore((s) => s.sync.dirty.length);
  const [mail, setMail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (status === 'local')
    return <p className="m-0 text-xs text-muted">Tus diagramas se guardan en este celular. La nube todavía no está configurada en esta app.</p>;

  if (status === 'out')
    return (
      <div className="flex flex-col gap-2">
        <div className="lbl">Tu cuenta</div>
        <p className="m-0 text-xs text-muted">Entra con tu correo para guardar tus diagramas en la nube y verlos en el celular y en el PC. Sin entrar, se guardan solo en este equipo.</p>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            setBusy(true);
            const err = await sendLogin(mail);
            setBusy(false);
            setSent(!err);
            setMsg(err || 'Te enviamos un correo. Toca el enlace, o escribe aquí el código de 6 dígitos.');
          }}
        >
          <input className="min-w-[200px] flex-1 rounded-[7px] border border-line bg-panel px-2 py-2" type="email" required autoComplete="email" placeholder="tu.correo@bia.app" aria-label="Correo" value={mail} onChange={(e) => setMail(e.target.value)} />
          <button className="btn-pri" disabled={busy}>Enviarme el acceso</button>
        </form>
        {sent && (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={async (ev) => {
              ev.preventDefault();
              setBusy(true);
              const err = await verifyCode(mail, code);
              setBusy(false);
              setMsg(err || '');
            }}
          >
            <input className="w-[140px] rounded-[7px] border border-line bg-panel px-2 py-2 font-mono tracking-widest" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" aria-label="Código del correo" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn" disabled={busy || code.trim().length < 6}>Entrar</button>
          </form>
        )}
        {msg && <p className="m-0 text-sm">{msg}</p>}
      </div>
    );

  return (
    <div className="flex flex-col gap-1.5">
      <div className="lbl">Tu cuenta</div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Conectado como <b>{email}</b></span>
        <CloudChip />
        <button className="btn ml-auto" onClick={() => schedule(0)}>Sincronizar ahora</button>
        <button className="btn" onClick={() => void signOut()}>Cerrar sesión</button>
      </div>
      <p className="m-0 text-xs text-muted">
        {status === 'error' ? error : status === 'offline' ? 'Sin internet: tus cambios quedan en el celular y se suben solos cuando vuelva la señal.' : lastSync ? `Última sincronización ${ago(lastSync)}.` : 'Tus diagramas se guardan en la nube y en este celular.'}
        {pend > 0 && status !== 'syncing' ? ` Faltan ${pend} por subir.` : ''}
      </p>
    </div>
  );
}
