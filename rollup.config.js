import sass from 'rollup-plugin-sass';
import minifyHTML from 'rollup-plugin-minify-html-literals';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const isProd = process.env.PROD;

export default [
  {
    input: 'src/init.js',
    output: {
      file: 'dist/js/init.min.js',
      format: 'iife',
      name: 'TGInit'
    },
    plugins: [
      sass({
        output: 'dist/css/init.min.css',
        processor: isProd && (css => postcss([
          autoprefixer(),
          cssnano()
        ])
          .process(css, {
            from: undefined
          })
          .then(result => result.css))
      }),
      isProd && babel(),
      isProd && terser({
        parse: {
          ecma: 5
        }
      })
    ]
  },
  {
    input: 'src/mtproto.js',
    output: {
      file: 'dist/js/mtproto.min.js',
      format: 'iife',
      name: 'MTProto'
    },
    plugins: [
      isProd && babel(),
      isProd && terser({
        parse: {
          ecma: 5
        }
      })
    ]
  },
  {
    input: 'src/auth.js',
    output: {
      file: 'dist/js/auth.min.js',
      format: 'iife',
      name: 'TGAuth'
    },
    plugins: [
      sass({
        output: 'dist/css/auth.min.css',
        processor: isProd && (css => postcss([
          autoprefixer(),
          cssnano()
        ])
          .process(css, {
            from: undefined
          })
          .then(result => result.css))
      }),
      minifyHTML({
        options: {
          shouldMinify: template => {
            return template.parts[0].text.charAt(0) == '<';
          }
        }
      }),
      isProd && babel(),
      isProd && terser({
        parse: {
          ecma: 5
        }
      })
    ]
  },
  {
    input: 'src/app.js',
    output: {
      file: 'dist/js/app.min.js',
      format: 'iife',
      name: 'TGApp'
    },
    plugins: [
      sass({
        output: 'dist/css/app.min.css',
        processor: isProd && (css => postcss([
          autoprefixer(),
          cssnano()
        ])
          .process(css, {
            from: undefined
          })
          .then(result => result.css))
      }),
      minifyHTML({
        options: {
          shouldMinify: template => {
            return template.parts[0].text.charAt(0) == '<';
          }
        }
      }),
      isProd && babel(),
      isProd && terser({
        parse: {
          ecma: 5
        }
      })
    ]
  }
];