import { history } from 'umi';
import EventBoard from '@/components/EventBoard';
import { PageContainer } from '@ant-design/pro-components';
import axios from 'axios';
import styles from './index.less';
import { useEffect } from 'react';

const defaultOptions = {
  googleBoard: "YOUR_GOOGLE_DASHBOARD_URL",
  googleZone: "GOOGLE_ZONE",
  googleProjectId: "YOUR_GOOGLE_PROJECT_ID",
};

const HomePage: React.FC = () => {

  useEffect(() => {
    axios.get(`${CONFIG.BASEPATH}/events/authenticated`, {
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('jwt')}`
      }
    })
    .catch(() => {
      history.push('/login');
      return;
    })
  }, [])

  return (
    <PageContainer
      header={{ title: <span className={styles.titleStyle}>{'Events'}</span> }}
    >
      <div className={styles.container}>
        <EventBoard options={defaultOptions} />
      </div>
    </PageContainer>
  );
};

export default HomePage;
