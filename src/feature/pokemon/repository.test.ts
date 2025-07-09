import { fetchPokemonList } from "./repository";

describe("fetchPokemonList", () => {
	it("正常系: ポケモンリストが正常に取得できる場合、期待通りの配列が返る", async () => {
		const mockResults = [
			{ name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
			{ name: "ivysaur", url: "https://pokeapi.co/api/v2/pokemon/2/" },
		];
		global.fetch = jest.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ results: mockResults }),
		});

		const result = await fetchPokemonList();
		expect(result).toEqual(mockResults);
	});

	it("異常系: fetchのレスポンスがokでない場合、エラーがthrowされる", async () => {
		global.fetch = jest.fn().mockResolvedValue({
			ok: false,
			status: 500,
			json: async () => ({}),
		});

		await expect(fetchPokemonList()).rejects.toThrow(
			"Network response was not ok",
		);
	});

	it("異常系: fetchが例外をthrowした場合、エラーがthrowされる", async () => {
		global.fetch = jest.fn().mockRejectedValue(new Error("fetch failed"));

		await expect(fetchPokemonList()).rejects.toThrow("fetch failed");
	});
});
