import React, { useCallback, useEffect, useState } from 'react';
import { Layout, Input, Row, Col, Space } from 'antd';
import Actions from '../Actions';
import EventList from '../List';
import Links from '../Links';
import { eventStatsApi } from '@/services/api';
import styles from "./EventBoard.less";

const EventBoard: React.FC<any> = (options) => {

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [filterKey, setFilterKey] = useState("");
  const [searchValue, setSearchValue] = useState("");

  const refresh = useCallback(() => {
    setLoading(true);
    eventStatsApi.eventStatsGet(undefined, 'topic:ASC,subscription:DESC').then(({ data }) => {
      setList(data);
      setLoading(false);
    })
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setFilterKey(searchValue); }, 1000);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const renderSearch = () => (
    <Input.Search size="large" allowClear={true} onChange={e => setSearchValue(e.target.value)} value={searchValue} />
  );

  useEffect(() => {
    refresh()
  }, []);

  const renderLinks = () => <Links options={options} />;

  const renderActions = () => (
    <Actions 
        filterKey={searchValue}
        setFilterKey={setSearchValue}
        refresh={refresh}
        list={list}
    />
  );

  const renderList = () => (
    <EventList
        options={options}
        loading={loading}
        refresh={refresh}
        list={list}
        filterKey={filterKey}
    />
  );

  const colProps = {
    xs: 24,
    sm: 12,
    md: 12,
    lg: 12,
    xl: 12,
    xxl: 12,
  }

  return (
    <Layout>
      <Row className={styles.searchAndActions} gutter={[8, 16]}>
        <Col {...colProps}>
          {renderSearch()}
        </Col>
        <Col {...colProps} className={styles.actionsButton}>
          {renderLinks()}
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* <Col span={12}>
          {renderActions()}
        </Col> */}

        <Col span={24}>
          {renderList()}
        </Col>
      </Row>
    </Layout>
  );
};

export default EventBoard;
