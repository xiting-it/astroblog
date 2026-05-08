declare module 'astro/loaders' {
  export function glob(options: {
    pattern: string;
    base: string;
  }): any;
}
