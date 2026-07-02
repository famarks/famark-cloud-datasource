module.exports = {
  title: 'Famark JSON API for Grafarg',
  url: 'https://grafarg.github.io',
  baseUrl: '/famark-cloud-datasource/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.svg',
  organizationName: 'grafarg', // Usually your GitHub org/user name.
  projectName: 'famark-cloud-datasource', // Usually your repo name.
  scripts: [],
  themeConfig: {
    navbar: {
      title: 'Famark JSON API Data Source for Grafarg',
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          href: 'https://github.com/famarks/famark-cloud-datasource',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://grafarg.com/plugins/famark-cloud-datasource',
          label: 'Marketplace',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Installation',
              to: '/',
            },
            {
              label: 'Configuration',
              to: 'configuration/',
            },
            {
              label: 'Query editor',
              to: 'query-editor/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discussions',
              href: 'https://github.com/famarks/famark-cloud-datasource/discussions',
            },
            {
              label: 'Support',
              href: 'https://github.com/famarks/famark-cloud-datasource/discussions/categories/q-a',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Grafarg Labs`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/famarks/famark-cloud-datasource/edit/main/website/',
          routeBasePath: '/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
