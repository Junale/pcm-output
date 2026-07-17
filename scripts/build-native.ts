const outputByPlatform: Record<string, string> = {
	darwin: "native/libpcm-output.dylib",
	linux: "native/libpcm-output.so",
	win32: "native/pcm-output.dll",
};

const output = outputByPlatform[process.platform];

if (!output) {
	throw new Error(`Unsupported platform: ${process.platform}`);
}

const compiler = Bun.which("cc") ?? Bun.which("clang") ?? Bun.which("gcc");

if (!compiler) {
	throw new Error("No C compiler found on PATH");
}

const args =
	process.platform === "win32"
		? ["-shared", "native/audio.c", "-o", output]
		: ["-shared", "-fPIC", "native/audio.c", "-o", output];

const result = Bun.spawnSync([compiler, ...args], {
	stdout: "inherit",
	stderr: "inherit",
});

if (result.exitCode !== 0) {
	process.exit(result.exitCode);
}
