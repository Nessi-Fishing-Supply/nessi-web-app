/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

// Construct `__dirname` in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
    reactStrictMode: true,
    sassOptions: {
        sourceMap: true,
        includePaths: [path.join(__dirname, 'src/styles')],
    },
    output: 'export',

    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: [
                {
                    loader: '@svgr/webpack',
                    options: {
                        svgo: false,
                    },
                },
            ],
        });

        config.resolve.alias = {
            ...config.resolve.alias,
            '@styles': path.resolve(__dirname, 'src/styles'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@images': path.resolve(__dirname, 'src/assets/images'),
            '@icons': path.resolve(__dirname, 'src/assets/icons'),
            '@logos': path.resolve(__dirname, 'src/assets/logos'),
        };

        return config;
    },
};

export default nextConfig;