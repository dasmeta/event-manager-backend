import EventBoard from '@/components/EventBoard';
// import { trim } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import styles from './index.less';

const defaultOptions = {
  googleBoard: "YOUR_GOOGLE_DASHBOARD_URL",
  googleZone: "GOOGLE_ZONE",
  googleProjectId: "YOUR_GOOGLE_PROJECT_ID",
};

const HomePage: React.FC = () => {
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
