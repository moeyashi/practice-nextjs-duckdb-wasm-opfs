import type { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { useEffect, useState } from "react";
import { withDuckDbWasmOpfs } from "../../lib/duck-db-wasm-opfs";
import { fetchPokemonList } from "./repository";

export const usePokemonList = () => {
	const [pokemonList, setPokemonList] = useState<PokemonList>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const f = async () => {
			setLoading(true);
			setError("");
			try {
				const response = await fetchFromDuckDBOrAPI();
				setPokemonList(response);
			} catch (error) {
				setError(
					error instanceof Error
						? error.message
						: "An unexpected error occurred",
				);
			} finally {
				setLoading(false);
			}
		};
		f();
	}, []);

	return { pokemonList, loading, error };
};

type PokemonList = Awaited<ReturnType<typeof fetchPokemonList>>;

const fetchFromDuckDBOrAPI = async () => {
	try {
		return await withDuckDbWasmOpfs(async (db) => {
			const c = await db.connect();

			try {
				return await fetchFromDuckDB(c);
			} catch {
				const pokemonList = await fetchPokemonList();
				try {
					await insertPokemonToDuckDB(pokemonList, db, c);
				} catch (error) {
					// エラーを出力し、APIから取得したリストをそのまま返す
					console.error("Failed to insert data into DuckDB:", error);
				}
				return pokemonList;
			}
		});
	} catch (error) {
		// エラーが発生した場合は、DuckDBを使わずAPIからポケモンリストを取得
		console.error(error);
		return await fetchPokemonList();
	}
};

const fetchFromDuckDB = async (conn: AsyncDuckDBConnection) => {
	const result = await conn.query("SELECT * FROM pokemon;");
	if (result.numRows === 0) {
		throw new Error("NoDataError");
	}

	return result.toArray();
};

const insertPokemonToDuckDB = async (
	pokemonList: PokemonList,
	db: AsyncDuckDB,
	conn: AsyncDuckDBConnection,
) => {
	// pokemonlist to JSON
	db.registerFileText("pokemon_list.json", JSON.stringify(pokemonList));

	// recreate table
	await conn.query("DROP TABLE IF EXISTS pokemon;");
	await conn.query(
		"CREATE TABLE pokemon AS SELECT name, url FROM read_json('pokemon_list.json', columns = { 'name': VARCHAR, 'url': VARCHAR })",
	);
	await conn.query("CHECKPOINT;");
};
