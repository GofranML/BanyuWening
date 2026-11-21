import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    title: (title) => title ? `${title} : BanyuWening` : 'BanyuWening : Smart Aquaculture IoT Multi-Kolam & AI Decision Support',
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true });
        const page = pages[`./Pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Page ./Pages/${name}.tsx not found.`);
        }
        return page;
    },
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#33706A',
    },
});
