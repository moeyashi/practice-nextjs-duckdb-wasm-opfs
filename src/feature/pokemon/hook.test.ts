import { renderHook, waitFor } from "@testing-library/react";
import { withDuckDbWasmOpfs } from "../../lib/duck-db-wasm-opfs";
import { usePokemonList } from "./hook";
import { fetchPokemonList } from "./repository";

jest.mock("../../lib/duck-db-wasm-opfs");
const mockedWithDuckDbWasmOpfs = withDuckDbWasmOpfs as jest.MockedFunction<
	typeof withDuckDbWasmOpfs
>;

jest.mock("./repository");
const mockedFetchPokemonList = fetchPokemonList as jest.MockedFunction<
	typeof fetchPokemonList
>;

describe("usePokemonList", () => {
	describe("duckdbが使用不可の場合", () => {
		beforeEach(() => {
			mockedWithDuckDbWasmOpfs.mockRejectedValue(
				new Error("DuckDB not available"),
			);
		});

		it("初期状態でpokemonListは空配列である", () => {
			const { result, unmount } = renderHook(() => usePokemonList());
			expect(result.current.loading).toEqual(true);
			expect(result.current.pokemonList).toEqual([]);
			expect(result.current.error).toBe("");
			// actのconsole.errorを起こさないためにunmountを呼び出す
			// An update to TestComponent inside a test was not wrapped in act(...).
			unmount();
		});

		it("fetchPokemonListが成功した場合、pokemonListがセットされloadingがfalseになる", async () => {
			const mockList = [
				{ name: "pikachu", url: "http://pokemon.test/1" },
				{ name: "bulbasaur", url: "http://pokemon.test/2" },
			];
			mockedFetchPokemonList.mockResolvedValueOnce(mockList);

			const { result } = renderHook(() => usePokemonList());
			await waitFor(() => expect(result.current.pokemonList).toEqual(mockList));
			await waitFor(() => expect(result.current.loading).toEqual(false));
			await waitFor(() => expect(result.current.error).toBe(""));
		});

		it("fetchPokemonListが失敗した場合、errorがセットされloadingがfalseになる", async () => {
			const errorMessage = "API Error";
			mockedFetchPokemonList.mockRejectedValueOnce(new Error(errorMessage));

			const { result } = renderHook(() => usePokemonList());
			await waitFor(() => expect(result.current.error).toBe(errorMessage));
			await waitFor(() => expect(result.current.loading).toEqual(false));
			await waitFor(() => expect(result.current.pokemonList).toEqual([]));
		});
	});

	describe("duckdbが使用可能な場合", () => {
		// biome-ignore lint/suspicious/noExplicitAny: テストのため許可
		let mockConn: any;
		// biome-ignore lint/suspicious/noExplicitAny: テストのため許可
		let mockDb: any;

		beforeEach(() => {
			mockConn = {
				query: jest.fn(),
			};
			mockDb = {
				connect: jest.fn().mockResolvedValue(mockConn),
				registerFileText: jest.fn(),
			};
			mockedWithDuckDbWasmOpfs.mockReset();
			mockedFetchPokemonList.mockReset();
		});

		it("DuckDBにデータが存在する場合、APIを呼ばずにpokemonListがセットされる", async () => {
			const duckdbList = [
				{ name: "pikachu", url: "http://pokemon.test/1" },
				{ name: "bulbasaur", url: "http://pokemon.test/2" },
			];
			// DuckDBにデータがある場合
			mockConn.query.mockImplementation(async (sql: string) => {
				if (sql.includes("SELECT")) {
					return { data: duckdbList, toArray: () => duckdbList, numRows: 2 };
				}
				return {};
			});
			mockedWithDuckDbWasmOpfs.mockImplementation(async (cb) => cb(mockDb));

			const { result } = renderHook(() => usePokemonList());
			await waitFor(() =>
				expect(result.current.pokemonList).toEqual(duckdbList),
			);
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe("");
			expect(mockedFetchPokemonList).not.toHaveBeenCalled();
		});

		it("DuckDBにデータが存在しない場合、APIから取得し、DBへinsertされる", async () => {
			// DuckDBにデータがない場合
			mockConn.query
				.mockImplementationOnce(async (sql: string) => {
					if (sql.includes("SELECT")) {
						return { data: [], toArray: () => [], numRows: 0 };
					}
					return {};
				})
				// DROP TABLE, CREATE TABLE, INSERT用のmock
				.mockResolvedValue({});

			const apiList = [{ name: "charmander", url: "http://pokemon.test/3" }];
			mockedFetchPokemonList.mockResolvedValueOnce(apiList);
			mockedWithDuckDbWasmOpfs.mockImplementation(async (cb) => cb(mockDb));

			const { result } = renderHook(() => usePokemonList());
			await waitFor(() => expect(result.current.pokemonList).toEqual(apiList));
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe("");
			expect(mockedFetchPokemonList).toHaveBeenCalled();
			expect(mockDb.registerFileText).toHaveBeenCalledWith(
				"pokemon_list.json",
				JSON.stringify(apiList),
			);
			// DROP TABLE, CREATE TABLE, INSERTが呼ばれている
			expect(mockConn.query).toHaveBeenCalledWith(
				"DROP TABLE IF EXISTS pokemon;",
			);
			expect(mockConn.query).toHaveBeenCalledWith(
				"CREATE TABLE pokemon AS SELECT name, url FROM read_json('pokemon_list.json', columns = { 'name': VARCHAR, 'url': VARCHAR })",
			);
			expect(mockConn.query).toHaveBeenCalledWith("CHECKPOINT;");
		});

		it("DuckDB/insert時にエラーが発生した場合、APIから取得したリストがセットされerrorは空文字のまま", async () => {
			// DuckDBにデータがない場合
			mockConn.query
				.mockImplementationOnce(async (sql: string) => {
					if (sql.includes("SELECT")) {
						return { data: [], toArray: () => [], numRows: 0 };
					}
					return {};
				})
				// DROP TABLE, CREATE TABLE, INSERT用のmock
				.mockResolvedValue({});

			const apiList = [{ name: "eevee", url: "http://pokemon.test/4" }];
			mockedFetchPokemonList.mockResolvedValueOnce(apiList);
			// insert時にエラー
			mockConn.query.mockImplementation((sql: string) => {
				if (sql.includes("INSERT INTO pokemon")) {
					throw new Error("insert error");
				}
				return {};
			});
			mockedWithDuckDbWasmOpfs.mockImplementation(async (cb) => cb(mockDb));

			const { result } = renderHook(() => usePokemonList());
			await waitFor(() => expect(result.current.pokemonList).toEqual(apiList));
			expect(result.current.loading).toBe(false);
			expect(result.current.error).toBe("");
		});
	});
});
