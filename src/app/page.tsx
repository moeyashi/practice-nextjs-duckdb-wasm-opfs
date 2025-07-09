"use client";
import { usePokemonList } from "../feature/pokemon/hook";
import styles from "./page.module.css";

export default function Home() {
	const { pokemonList, loading, error } = usePokemonList();
	if (loading) {
		return <div className={styles.loading}>Loading...</div>;
	}
	if (error) {
		return <div className={styles.error}>Error: {error}</div>;
	}

	return (
		<div className={styles.page}>
			<main className={styles.main}>
				<h1>hello world</h1>
				<ol>
					{pokemonList.map((pokemon) => (
						<li key={pokemon.name}>
							<a href={pokemon.url} target="_blank" rel="noopener noreferrer">
								{pokemon.name}
							</a>
						</li>
					))}
				</ol>
			</main>
		</div>
	);
}
