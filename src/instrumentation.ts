export async function register() {
	if (process.env.NODE_ENV === "development") {
		const { server } = await import("./lib/msw/server");
		server.listen();
	}
}
