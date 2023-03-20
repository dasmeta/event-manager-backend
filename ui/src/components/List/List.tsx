import React, { useRef, useState } from "react";
import { Col, Row, Space, Typography, Table, Button } from "antd";
import { CaretDownOutlined } from "@ant-design/icons"
import { isError, isFail, isPreconditionFail, isMissing, isAnomaly, isSuccess } from "@/utils/checker";
import ErrorCard from '../ErrorCard/index';
import EventModal from "../EventModal";
import ItemStatusTags from "../ItemStatusTags";
import CalculateSingleAction from "../CalculateSingleAction";
import CleanAnomalyAction from "../CleanAnomalyAction";
import FixMissingAction from "../FixMissingAction";
import Fail from "../Fail";
import Missing from "../Missing";
import Anomaly from "../Anomaly";
import MarkAsFail from "../MarkAsFail";
import Republish from "../Republish";
import formatMoney from "@/utils/format-number";
import translations from "@/assets/translations";
import { eventApi } from "@/services/api";
import { IconCopy, IconLogs, IconFunctions } from "@/assets/icons";
import styles from "./List.less"

const { Paragraph } = Typography;

export default React.memo(({
    options,
    loading,
    refresh,
    list,
    filterKey,
    updateEvent
}) => {

    const errorCard = useRef<any>(null);
    const eventModal = useRef<any>(null);

    const [expanded, setExpanded] = useState<Array<number>>([]);

    const handleShowErrors = ({ topic, subscription, id }) => {
        if(expanded.includes(id)) {
            const newState = expanded.filter(index => id !== index);
            setExpanded(newState);
        } else {
            const newState = [...expanded];
            newState.push(id);
            errorCard?.current?.show(topic, subscription);
            setExpanded(newState);
        }
    };

    const handleShowEvent = (eventId, { topic, subscription }) => {
        eventModal?.current?.open(eventId, topic, subscription);
    };

    const renderFunctionButton = (item) => {
        return (
            <Button
                size="small"
                href={`https://console.cloud.google.com/functions/details/${options.googleZone}/${
                    item.subscription
                }?project=${options.googleProjectId}`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <IconFunctions /> Function
            </Button>
        )
    }

    const renderLogsButton = (item) => {
        return (
            <Button
                size="small"
                href={`https://console.cloud.google.com/logs/viewer?project=${
                    options.googleProjectId
                }&minLogLevel=0&expandAll=false&resource=cloud_function%2Ffunction_name%2F${
                    item.subscription
                }`}
                target="_blank"
                rel="noopener noreferrer"
            >
                <IconLogs /> Logs
            </Button>
        )
    }

    const renderItem = (item, name) => {
        const {topic, subscription} = item;

        return (
            <>
                <Row gutter={[16, 16]}>
                    <Col>
                        <Paragraph
                            copyable={{
                                text: topic,
                                icon: <IconCopy />
                            }}
                        >
                            {topic} 
                        </Paragraph>
                    </Col>
                    <Col>
                        <Space size='small' >
                            <ItemStatusTags item={item} />
                        </Space>
                    </Col>
                </Row>
                <Row gutter={8}>
                    <Col>
                        <Paragraph
                            copyable={{
                                text: subscription,
                                icon: <IconCopy />
                            }}
                        >
                            <span className={styles.textStyle}>
                                {translations.subscription}{": "}
                                <span className={styles.subscriptionTextStyle}>{subscription}</span>
                            </span> 
                        </Paragraph>
                    </Col>
                </Row>
                <Space size={[8, 8]} wrap>
                    <CalculateSingleAction
                        subscription={subscription}
                        topic={topic}
                        refresh={refresh} />
                    {isFail(item) && (
                        <Republish
                            title="Republish fails for this subscription?"
                            subscription={subscription}
                            topic={topic}
                            republish={(data) => eventApi.eventsRepublishFailPost(data)}
                            refresh={refresh}
                            buttonText={translations.republishFail}
                        />
                    )}
                    {isError(item) && (
                        <Republish
                            title="Republish errors for this subscription?"
                            subscription={subscription}
                            topic={topic}
                            republish={(data) => eventApi.eventsRepublishErrorPost(data)}
                            refresh={refresh}
                            buttonText={translations.republishError}
                        />
                    )}
                    {isPreconditionFail(item) && (
                        <Republish
                            title="Republish precondition fails for this subscription?"
                            subscription={subscription}
                            topic={topic}
                            republish={(data) => eventApi.eventsRepublishPreconditionFailPost(data)}
                            refresh={refresh}
                            buttonText={translations.republishPreconditionFail}
                        />
                    )}
                    <CleanAnomalyAction item={item} refresh={refresh} />
                    <FixMissingAction item={item} refresh={refresh} />
                    {renderFunctionButton(item)}
                    {renderLogsButton(item)}
                    <MarkAsFail item={item} refresh={refresh} />
                </Space>
            </>
        );
    };

    const columns = [
        {
            key: "topic",
            title: 'Topic / Subscription',
            dataIndex: "topic",
            render: (topic, item) => renderItem(item, "topic"),
        },
        // Table.EXPAND_COLUMN,
        {
            key: "error",
            title: (translations.error),
            dataIndex: "error",
            sorter: (a, b) => a.error - b.error,
            render: (error, item) => (
                <a className={styles.error} onClick={() => handleShowErrors(item)}>
                    {formatMoney(item.error)}
                    {item.error >= 1 && <CaretDownOutlined />}
                </a>
            )
        },
        {
            key: "fail",
            title: (translations.fail),
            dataIndex: "fail",
            sorter: (a, b) => a.fail - b.fail,
            render: (fail, item) => (
                <Fail
                    count={isFail(item) ? item.fail : 0}
                    type="fail"
                    topic={item.topic}
                    subscription={item.subscription}
                    refresh={refresh}
                />
            )
        },
        {
            key: "preconditionFail",
            title: (translations.preconditionFail),
            dataIndex: "preconditionFail",
            render: (preconditionFail, item) => (
                <Fail
                    count={item.preconditionFail}
                    type="preconditionFail"
                    topic={item.topic}
                    subscription={item.subscription}
                    refresh={refresh}
                />
            )
        },
        {
            key: "missing",
            title: (translations.missing),
            dataIndex: "missing",
            render: (missing, item) => (
                <Missing item={item} refresh={refresh} />
            )
        },
        {
            key: "anomaly",
            title: (translations.anomaly),
            dataIndex: "anomaly",
            render: (anomaly, item) => (
                <Anomaly item={item} refresh={refresh} />
            )

        },
        {
            key: "success",
            title: (translations.success),
            dataIndex: "success",
            render: (success, item) => (
                <span className={styles.success}>
                    {formatMoney(item.success)}
                </span>
            )
        },
        {
            key: "total",
            title: (translations.total),
            dataIndex: "total",
            render: (total, item) => (
                <span className={styles.total}>
                    {formatMoney(item.total)}
                </span>
            )
        },
    ];

    const filter = (item: { topic: any; subscription: any; }) => {
        const { topic, subscription } = item;

        if (!filterKey) {
            return true;
        }
        if (filterKey === "error") {
            return isError(item);
        }
        if (filterKey === "fail") {
            return isFail(item);
        }
        if (filterKey === "preconditionFail") {
            return isPreconditionFail(item);
        }
        if (filterKey === "missing") {
            return isMissing(item);
        }
        if (filterKey === "anomaly") {
            return isAnomaly(item);
        }
        if (filterKey === "success") {
            return isSuccess(item);
        }
        if (filterKey.substr(0, 1) === "=") {
            return topic === filterKey.substr(1) || subscription === filterKey.substr(1);
        }
        return topic && topic.includes(filterKey) || subscription && subscription.includes(filterKey);
    };

    return (
        <div className={styles.dataContainer}>
            <Table
                rowKey={(record) => record.id}
                expandedRowKeys={expanded}
                rowClassName="no-hover-row"
                loading={loading}
                columns={columns}
                dataSource={list.filter(filter)}
                pagination={{ position: ["bottomCenter"] }}
                scroll={{ x: 1300 }}
                expandable={{
                    showExpandColumn: false,
                    expandedRowRender: (record, index, indent, expanded) => (
                        <ErrorCard 
                            subscription={record.subscription} 
                            topic={record.topic}
                            onShowEvent={handleShowEvent} 
                            refresh={refresh} 
                        />
                    ),
                    rowExpandable: (record) => record.error >= 1 ?? null,
                }}
            />

            <EventModal
                ref={eventModal}
                updateEvent={updateEvent}
                refresh={refresh}
            />
        </div>
    );
})
