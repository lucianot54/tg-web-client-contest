import sass from 'rollup-plugin-sass';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import { string } from 'rollup-plugin-string';
import postcss from 'postcss';
import cssnano from 'cssnano';
import { terser } from 'rollup-plugin-terser';

const isProd = process.env.PROD;

const onwarn = warning => {
  if(warning.code === 'CIRCULAR_DEPENDENCY') return;
  console.warn(`(!) ${warning.message}`);
};

const minifyOptions = {
  collapseWhitespace: true,
  removeAttributeQuotes: false,
  sortAttributes: false,
  sortClassName: true
};

export default [
  {
    input: 'src/init.js',
    output: {
      file: 'dist/js/init.min.js',
      format: 'iife'
    },
    plugins: [
      isProd && terser()
    ],
    watch: {
      clearScreen: false
    }
  },
  {
    input: 'src/main/index.js',
    output: {
      file: 'dist/js/main.min.js',
      format: 'iife',
      name: 'tgMain'
    },
    plugins: [
      sass({
        output: 'dist/css/main.min.css',
        processor: isProd && (css => postcss([
          cssnano()
        ])
          .process(css, {
            from: undefined
          })
          .then(result => result.css))
      }),
      isProd && terser()
    ],
    watch: {
      clearScreen: false
    }
  },
  {
    input: 'src/proto/index.js',
    output: {
      file: 'dist/js/proto.min.js',
      format: 'iife',
      name: 'tgProto'
    },
    plugins: [
      string({
        include: '**/*.tl'
      }),
      isProd && terser()
    ],
    watch: {
      clearScreen: false
    },
    onwarn
  },
  {
    input: 'src/worker/index.js',
    output: {
      file: 'dist/js/worker.min.js',
      format: 'iife'
    },
    plugins: [
      isProd && terser()
    ],
    watch: {
      clearScreen: false
    }
  },
  {
    input: 'src/auth/index.js',
    output: {
      file: 'dist/js/auth.min.js',
      format: 'iife',
      name: 'tgAuth'
    },
    plugins: [
      sass({
        output: 'dist/css/auth.min.css',
        processor: isProd && (css => postcss([
          cssnano()
        ])
          .process(css, {
            from: undefined
          })
          .then(result => result.css))
      }),
      minifyHTML({
        options: {
          minifyOptions,
          shouldMinify: template => {
            return template.parts[0].text.charAt(0) == '<';
          }
        }
      }),
      string({
        include: [ '**/*.txt', '**/*.tl' ]
      }),
      isProd && terser()
    ],
    watch: {
      clearScreen: false
    }
  },
  {
    input: 'src/app/index.js',
    output: {
      file: 'dist/js/app.min.js',
      format: 'iife',
      name: 'tgApp'
    },
    plugins: [
      sass({
        output: 'dist/css/app.min.css',
        processor: isProd && (css => postcss([
          cssnano()
        ])
          .process(css, {
            from: undefined
          })
          .then(result => result.css))
      }),
      minifyHTML({
        options: {
          minifyOptions,
          shouldMinify: template => {
            return template.parts[0].text.charAt(0) == '<';
          }
        }
      }),
      string({
        include: [ '**/*.tl' ]
      }),
      isProd && terser()
    ],
    watch: {
      clearScreen: false
    },
    onwarn
  }
];