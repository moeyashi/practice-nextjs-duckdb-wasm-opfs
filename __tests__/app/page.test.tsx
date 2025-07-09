import { render, screen } from "@testing-library/react";
import Page from "../../src/app/page";

// ページテストではDuckDBは使えないので、APIのデータが使われる。
describe("Page", () => {
	it("renders a heading", async () => {
		render(<Page />);

		const heading = await screen.findByRole("heading", { level: 1 });

		expect(heading).toBeInTheDocument();
	});

	it("renders a list of pokemon", async () => {
		render(<Page />);

		const listItem = await screen.findByText("test");

		expect(listItem).toBeInTheDocument();
		expect(listItem).toHaveAttribute(
			"href",
			"https://pokeapi.co/api/v2/pokemon/1/",
		);
	});
});
