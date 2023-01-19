import React, { useCallback, useEffect, useState } from 'react';
import { Layout, Input, Row, Col } from 'antd';
import Actions from '../Actions';
import EventList from '../List';
import Links from '../Links';
import { eventStatsApi } from '@/services/api';

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

  return (
    <Layout>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          {renderActions()}
        </Col>
        <Col span={24}>
        {renderSearch()}
        </Col>
        <Col span={24}>
          {renderLinks()}
        </Col>
        <Col span={24}>
        {renderList()}
        </Col>
      </Row>
    </Layout>
  );
};

export default EventBoard;
