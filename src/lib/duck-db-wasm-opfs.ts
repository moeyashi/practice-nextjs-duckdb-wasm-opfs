import * as duckdb from "@duckdb/duckdb-wasm";

const LOGGER = new duckdb.ConsoleLogger();
const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();

export const withDuckDbWasmOpfs = async <T>(
	fn: (db: duckdb.AsyncDuckDB) => Promise<T>,
): Promise<T> => {
	return await navigator.locks.request("duckdb-wasm-lock", async () => {
		const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
		const workerUrl = URL.createObjectURL(
			new Blob([`importScripts("${bundle.mainWorker}");`], {
				type: "text/javascript",
			}),
		);
		const worker = new window.Worker(workerUrl);
		const db = new duckdb.AsyncDuckDB(LOGGER, worker);
		try {
			await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
			await db.open({
				path: "opfs://duckdb-wasm-v1.db",
				accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
			});

			//HACK https://github.com/duckdb/duckdb-wasm/pull/1962#issuecomment-2918724468
			const c = await db.connect();
			await c.query("CREATE OR REPLACE TABLE init_tmp as select 1;");
			await c.query("DROP TABLE init_tmp;");
			await c.close();

			return await fn(db);
		} finally {
			await db.terminate();
			URL.revokeObjectURL(workerUrl);
		}
	});
};
