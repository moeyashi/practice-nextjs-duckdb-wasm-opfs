import "@testing-library/jest-dom";
import { server } from "./src/lib/msw/server";

// MSW
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
