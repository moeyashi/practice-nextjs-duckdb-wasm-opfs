import { render, screen } from "@testing-library/react";
import Page from "../../src/app/page";

jest.mock("../../src/feature/pokemon/hook", () => ({
	usePokemonList: jest.fn(() => ({
		pokemonList: [{ name: "pikachu", url: "http://pokemon.test/1" }],
		loading: false,
		error: "",
	})),
}));

describe("Page", () => {
	it("renders a heading", async () => {
		render(<Page />);

		const heading = await screen.findByRole("heading", { level: 1 });

		expect(heading).toBeInTheDocument();
	});

	it("renders a list of pokemon", async () => {
		render(<Page />);

		const listItem = await screen.findByText("pikachu");

		expect(listItem).toBeInTheDocument();
		expect(listItem).toHaveAttribute("href", "http://pokemon.test/1");
	});
});
