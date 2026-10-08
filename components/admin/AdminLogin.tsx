'use client';

import { useActionState } from 'react';
import { loginAction, type ActionState } from '@/app/admin/actions';

export default function AdminLogin() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <div className="modal-overlay" style={{ position: 'static', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="modal-box">
        <div className="modal-title"><span>⚙ ACCESSO RISERVATO</span></div>
        <form className="modal-body" action={action}>
          <label className="field" htmlFor="username">NOME UTENTE</label>
          <input id="username" name="username" type="text" autoComplete="username" required autoFocus />

          <label className="field" htmlFor="password">PASSWORD</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />

          {state.error && <p className="msg-error">{state.error}</p>}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={pending}>
              {pending ? 'VERIFICO...' : 'ENTRA'}
            </button>
            <a className="btn-secondary" href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              TORNA AL SITO
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
