import { existsSync, readdirSync, statSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const serviceDirectory = join(projectDirectory, 'tracking-service-java');
const sourceDirectory = join(serviceDirectory, 'src', 'main', 'java');
const classesDirectory = join(serviceDirectory, 'build', 'classes');
const mainClass = 'com.blooddonation.tracking.TrackingServer';
const mainClassFile = join(classesDirectory, ...mainClass.split('.')) + '.class';

function findJavaSources(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const sources = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      sources.push(...findJavaSources(fullPath));
    } else if (entry.name.endsWith('.java')) {
      sources.push(fullPath);
    }
  }
  return sources;
}

function commandWorks(command) {
  const result = spawnSync(command, ['-version'], { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

const javaCommand = process.env.JAVA_COMMAND || 'java';
const javacCommand = process.env.JAVAC_COMMAND || 'javac';
const sources = findJavaSources(sourceDirectory);

if (sources.length === 0) {
  console.error(`No Java sources found in ${sourceDirectory}.`);
  process.exit(1);
}

const needsBuild = () => {
  if (!existsSync(mainClassFile)) {
    return true;
  }
  const builtAt = statSync(mainClassFile).mtimeMs;
  return sources.some((source) => statSync(source).mtimeMs > builtAt);
};

if (commandWorks(javacCommand) && needsBuild()) {
  console.log('Building the Java live tracking service...');
  const build = spawnSync(
    javacCommand,
    ['-encoding', 'UTF-8', '-source', '1.8', '-target', '1.8', '-d', classesDirectory, ...sources],
    { cwd: serviceDirectory, stdio: 'inherit' },
  );
  if (build.error) {
    console.error(`Unable to run ${javacCommand}: ${build.error.message}`);
    process.exit(1);
  }
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
} else if (!existsSync(mainClassFile)) {
  console.error(
    'The Java live tracking service is not built and no JDK was found.\n' +
      'Install a JDK (8 or newer) and run "npm run tracking" again.',
  );
  process.exit(1);
}

if (!commandWorks(javaCommand)) {
  console.error(`Unable to run ${javaCommand}. Install a Java 8+ runtime or set JAVA_COMMAND.`);
  process.exit(1);
}

const child = spawn(javaCommand, ['-cp', classesDirectory, mainClass], {
  cwd: serviceDirectory,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`Unable to start the Java live tracking service: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
