import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { isAppId } from '../shared/apps';
import { registerOfficeIcons } from './icons';
import { applyOfficeTheme } from './theme';
import { APPS } from '../shared/apps';
import { StartScreen } from './start/StartScreen';
import { TasksApp } from './apps/tasks/TasksApp';
import { ServicesApp } from './apps/services/ServicesApp';
import { SysInfoApp } from './apps/sysinfo/SysInfoApp';

import './styles/global.css';
import './styles/office.css';
import './styles/start.css';
import './styles/apps.css';

registerOfficeIcons();

const params = new URLSearchParams(location.search);
const appId = params.get('app');

let root: React.ReactElement;
if (appId && isAppId(appId)) {
  applyOfficeTheme(APPS[appId]);
  root =
    appId === 'tasks' ? <TasksApp /> : appId === 'services' ? <ServicesApp /> : <SysInfoApp />;
} else {
  root = <StartScreen />;
}

ReactDOM.render(root, document.getElementById('root'));
