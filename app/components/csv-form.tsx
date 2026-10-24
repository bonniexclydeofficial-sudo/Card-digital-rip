"use client";

import { useActionState } from "react";
import { csvAction } from "@/lib/actions";

interface CsvState {
  ok: boolean;
  message: string;
  written: number;
  errors: { row: number; column: string; code: string; message: string }[];
}

const initial: CsvState = { ok: false, message: "", written: 0, errors: [] };

export function CsvForm({ sample }: { sample: string }) {
  const [state, action, pending] = useActionState(csvAction, initial);
  return (
    <form action={action}>
      <label htmlFor="csv">CSV</label>
      <textarea id="csv" name="csv" defaultValue={sample} spellCheck={false} />
      <div className="decision">
        <button className="btn secondary" type="submit" name="mode" value="dry" disabled={pending}>
          Dry run
        </button>
        <button className="btn" type="submit" name="mode" value="commit" disabled={pending}>
          Commit
        </button>
      </div>
      {state.message ? (
        <div data-testid="csv-report">
          <p className={state.ok ? "ok" : "error"}>{state.message}</p>
          <p className="muted">Rows written: {state.written}</p>
          {state.errors.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Column</th>
                  <th>Code</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {state.errors.map((error, index) => (
                  <tr key={`${error.row}-${error.code}-${index}`}>
                    <td>{error.row}</td>
                    <td>{error.column}</td>
                    <td>{error.code}</td>
                    <td>{error.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
