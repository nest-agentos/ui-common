# @nestos/ui-common

Dependency-free native DOM navigation, dialogs and browser utilities for browsers and WebViews. Hosts own routing, permissions, persistence and window management.

## Usage

```ts
import {contentTitleBar, navigationButton} from '@nestos/ui-common';
import '@nestos/ui-common/navigation.css';

const back = navigationButton({icon: backIcon, label: 'Back', run: () => navigateBack()});
const bar = contentTitleBar({leading: [back]});
container.append(bar.element);
bar.update({title: 'Document', context: 'Project'});
// Release when the owner is destroyed.
bar.destroy();
```

- `mountTitleBar`: exclusively mount shared layouts, preserving original nodes and preventing delayed teardown from reclaiming a newer mount.
- `contentTitleBar`: ordered navigation, editable/dirty state, optional context, title, actions and More. Inject state labels/icons through `statePresentation`.
- `navigationButton` / `navigationItem`: consistent icon controls and navigation item state.
- `MOBILE_NAVIGATION_QUERY`: the shared 768px mobile breakpoint.
- `retainTitleBarNodes`: restore supplied controls to their original slots after adoption.
- `installResponsiveActions`: move original controls between toolbar and overflow, preserving event bindings.

Supply original input and menu elements using `title`, `actions`, `menu` and `menuBody`. Secondary actions move into the existing menu on mobile; no business action is invoked by layout updates. Theme through the `--ui-nav-*` CSS variables. A title bar does not decide application navigation visibility.

No runtime dependencies. Application editor contracts and business forms belong in the host adapter. Build and publish configuration includes ESM, CommonJS, TypeScript declarations and CSS.

`Modal`, `Toast` and `showConfirmDialog` share `@nestos/ui-common/components.css`. Dialog titles, labels, toast messages and confirmation text are plain text; Modal content HTML is trusted host markup. Labels can be supplied without application i18n dependencies. Async confirmation can return false to retain its original fields.

`copyText` supports insecure-context clipboard fallback. `setTimePresentation(time, timestamp, fallback, locale?)` accepts a caller locale and clears stale timestamp attributes for missing dates. Generic menu types contain no application data.

Settings lifecycle helpers (`SettingsBaseEditor`, `SettingsAutoSave`, `requestSettingsSave`, `captureForm`, `restoreForm`) share save ownership and in-memory draft recovery. Hosts inject presentation and optional rename/metadata ports. Failed saves prevent closing and preserve input; successful repeated destruction releases subscriptions once. Recovery validates the whole form structure before applying values; snapshots may contain secrets and must never be persisted or logged.
