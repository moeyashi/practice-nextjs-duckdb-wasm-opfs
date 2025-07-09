import { HttpResponse, http } from "msw";
import { server } from "../../lib/msw/server";
import { fetchPokemonList } from "./repository";

describe("fetchPokemonList", () => {
	it("正常系: ポケモンリストが正常に取得できる場合、期待通りの配列が返る", async () => {
		// Arrange
		const mockResults = [
			{ name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
			{ name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon/2/" },
		];
		server.use(
			http.get("https://pokeapi.co/api/v2/pokemon", () => {
				return HttpResponse.json({
					count: 1302,
					next: "https://pokeapi.co/api/v2/pokemon?offset=20&limit=20",
					previous: null,
					results: mockResults,
				});
			}),
		);

		// Act
		const result = await fetchPokemonList();

		// Assert
		expect(result).toEqual(mockResults);
	});

	it("異常系: fetchのレスポンスがokでない場合、エラーがthrowされる", async () => {
		// Arrange
		server.use(
			http.get("https://pokeapi.co/api/v2/pokemon", () => {
				return HttpResponse.json({ error: "Not Found" }, { status: 404 });
			}),
		);

		// Act & Assert
		await expect(fetchPokemonList()).rejects.toThrow(
			"Network response was not ok",
		);
	});

	it("異常系: fetchが例外をthrowした場合、エラーがthrowされる", async () => {
		// Arrange
		global.fetch = jest.fn().mockRejectedValue(new Error("fetch failed"));

		// Act & Assert
		await expect(fetchPokemonList()).rejects.toThrow("fetch failed");
	});
});
