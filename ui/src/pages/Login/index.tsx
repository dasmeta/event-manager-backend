import { useState, useEffect } from 'react';
import { history } from 'umi';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Form, Input, message } from 'antd';
import axios from 'axios';
import translations from '@/assets/translations';
import styles from './index.less';

const AccessPage: React.FC = () => {

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    axios.get(`${CONFIG.BASEPATH}/events/authenticated`, {
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('jwt')}`
      }
    })
    .then(() => {
      history.push('/');
    })
  }, [])

  return (
    <PageContainer
      ghost
      title={<span className={styles.titleStyle}>{'Event Manager'}</span>}
    >
        <Form
          wrapperCol={{ span: 24 }}
          style={{ maxWidth: 400, margin: 'auto' }}
          onFinish={(values) => {
            setLoading(true);
            axios.post(`${CONFIG.BASEPATH}/auth/local`, {
              identifier: values.username,
              password: values.password
            })
            .then(({ data }) => {
              window.localStorage.setItem('jwt', data.jwt);
              setLoading(false);
              history.push('/');
            })
            .catch(() => {
              setLoading(false);
              message.error(translations.wrongCredentials);
            })
          }}
        >
            <Form.Item
              name="username"
              rules={[{ required: true, message: translations.requiredField }]}
            >
              <Input placeholder={translations.username} size='large'/>
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, message: translations.requiredField }]}
            >
              <Input.Password placeholder={translations.password} size='large' />
            </Form.Item>
            <Form.Item wrapperCol={{ span: 24 }}>
              <Button className={styles.button} htmlType="submit" size='large' loading={loading}>
                {translations.submit}
              </Button>
            </Form.Item>
          </Form>
    </PageContainer>
  );
};

export default AccessPage;
