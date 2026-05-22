---
id: installation
title: Installation
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

You can install the plugin using [grafarg-cli](https://grafarg.com/docs/grafarg/latest/administration/cli/), or by downloading the plugin manually.

## Install using grafarg-cli

To install the latest version of the plugin, run the following command on the Grafarg server:

<Tabs
groupId="operating-systems"
defaultValue="linux"
values={[
{label: 'Linux', value: 'linux'},
{label: 'macOS', value: 'macos'},
{label: 'Windows', value: 'windows'},
]}>
<TabItem value="linux">

```
grafarg-cli plugins install famark-cloud-datasource
```

  </TabItem>
  <TabItem value="macos">

```
grafarg-cli plugins install famark-cloud-datasource
```

  </TabItem>
  <TabItem value="windows">

```
grafarg-cli.exe plugins install famark-cloud-datasource
```

  </TabItem>
</Tabs>

## Install manually

1. Go to [Releases](https://github.com/famarks/famark-cloud-datasource/releases) on the GitHub project page
1. Find the release you want to install
1. Download the release by clicking the release asset called `famark-cloud-datasource-<version>.zip`. You may need to un-collapse the **Assets** section to see it.
1. Unarchive the plugin into the Grafarg plugins directory

   <Tabs
   groupId="operating-systems"
   defaultValue="linux"
   values={[
   {label: 'Linux', value: 'linux'},
   {label: 'macOS', value: 'macos'},
   {label: 'Windows', value: 'windows'},
   ]}>
   <TabItem value="linux">

   ```
   unzip famark-cloud-datasource-<version>.zip
   mv famark-cloud-datasource /var/lib/grafarg/plugins
   ```

     </TabItem>
     <TabItem value="macos">

   ```
   unzip famark-cloud-datasource-<version>.zip
   mv famark-cloud-datasource /usr/local/var/lib/grafarg/plugins
   ```

     </TabItem>
     <TabItem value="windows">

   ```
   Expand-Archive -Path famark-cloud-datasource-<version>.zip -DestinationPath C:\grafarg\data\plugins
   ```

     </TabItem>
   </Tabs>

1. Restart the Grafarg server to load the plugin
