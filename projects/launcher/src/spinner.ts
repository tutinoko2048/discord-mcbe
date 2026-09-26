const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export async function withSpinner<T>(message: string, task: () => Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) return task();

  let frame = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r${FRAMES[frame++ % FRAMES.length]} ${message}`);
  }, 80);

  try {
    return await task();
  } finally {
    clearInterval(timer);
    process.stdout.write('\r\x1b[2K');
  }
}
