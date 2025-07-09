"use client";

import { useEffect } from "react";

export const MSWComponent: React.FC = () => {
	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}
		if (typeof window === "undefined") {
			return;
		}
		import("./browser").then(({ worker }) => {
			worker.start();
		});
	}, []);
	return null;
};
