import React, { useRef } from "react";
import { Col, Divider, List, Row, Space, Typography, Table, Button, Pagination } from "antd";
import { CoffeeOutlined, UnorderedListOutlined } from "@ant-design/icons"
import { isError, isFail, isPreconditionFail, isMissing, isAnomaly, isSuccess } from "@/utils/checker";
import ErrorModal from "../ErrorModal";
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
// import styles from "@/assets/styles";
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

    const errorModal = useRef<any>(null);
    const eventModal = useRef<any>(null);

    const handleShowErrors = ({ topic, subscription }) => {
        errorModal.current.open(topic, subscription);
    };

    const handleShowEvent = (eventId, { topic, subscription }) => {
        eventModal.current.open(eventId, topic, subscription);
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
                <span className={styles.iconsFunctionStyle}><IconFunctions /></span> Function
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
                <span className={styles.iconsStyle}><IconLogs /></span> Logs
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
                                icon: <span className={styles.paragraphIconStyle}><IconCopy /></span>
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
                                icon: <span className={styles.paragraphIconStyle}><IconCopy /></span>
                            }}
                        >
                            <span className={styles.textStyle}>
                                {translations.subscription}{": "}
                                {subscription}
                            </span> 
                        </Paragraph>
                    </Col>
                </Row>
                <Space size={8} wrap>
                    <CalculateSingleAction
                        subscription={subscription}
                        topic={topic}
                        refresh={refresh} />
                    <Republish
                        title="Republish fails for this subscription?"
                        subscription={subscription}
                        topic={topic}
                        republish={(data) => eventApi.eventsRepublishFailPost(data)}
                        refresh={refresh}
                        buttonText={translations.republishFail}
                    />
                    <Republish
                        title="Republish errors for this subscription?"
                        subscription={subscription}
                        topic={topic}
                        republish={(data) => eventApi.eventsRepublishErrorPost(data)}
                        refresh={refresh}
                        buttonText={translations.republishError}
                    />
                    <Republish
                        title="Republish precondition fails for this subscription?"
                        subscription={subscription}
                        topic={topic}
                        republish={(data) => eventApi.eventsRepublishPreconditionFailPost(data)}
                        refresh={refresh}
                        buttonText={translations.republishPreconditionFail}
                    />
                    <CleanAnomalyAction item={item} refresh={refresh} />
                    <FixMissingAction item={item} refresh={refresh} />
                    {renderFunctionButton(item)}
                    {renderLogsButton(item)}
                    <MarkAsFail item={item} refresh={refresh} />
                </Space>
            </>
            

            // <List.Item.Meta
            //     key={`${name}-${item._id}`}
            //     description={
            //         <>
            //             <ItemStatusTags item={item} />
            //             <Row gutter={8}>
            //                 <Col md={6}>
            //                     <Paragraph copyable={{ text: item.topic }}>
            //                         <small>{translations.topic}</small> {item.topic}
            //                     </Paragraph>
            //                 </Col>
            //                 <Col md={18}>
            //                     <Paragraph copyable={{ text: item.subscription }}>
            //                         <small>{translations.subscription}</small> {item.subscription}
            //                     </Paragraph>
            //                 </Col>
            //             </Row>

            //             <div>
                            
            //                 {isError(item) && (
            //                     <>
            //                         <Divider type="vertical" />
            //                         {translations.error}:{" "}
            //                         <a style={styles.error} onClick={() => handleShowErrors(item)}>
            //                             {formatMoney(item.error)}
            //                         </a>
            //                     </>
            //                 )}
            //                 {isPreconditionFail(item) && (
            //                     <Fail
            //                         count={item.preconditionFail}
            //                         // title={translations.preconditionFail}
            //                         type="preconditionFail"
            //                         topic={item.topic}
            //                         subscription={item.subscription}
            //                         markAsSuccess={markAsSuccess}
            //                         refresh={refresh}
            //                     />
            //                 )}
            //                 {isFail(item) && (
            //                     <Fail
            //                         count={item.fail}
            //                         // title={translations.fail}
            //                         type="fail"
            //                         topic={item.topic}
            //                         subscription={item.subscription}
            //                         markAsSuccess={markAsSuccess}
            //                         refresh={refresh}
            //                     />
            //                 )}
            //                 <Missing
            //                     item={item}
            //                     refresh={refresh}
            //                 />
            //                 <Anomaly item={item} refresh={refresh} />
            //             </div>
            //             <div>
            //                 {translations.topic}: {formatMoney(item.topicCount)}
            //                 <Divider type="vertical" />
            //                 {translations.subscription}: {formatMoney(item.subscriptionCount)}
            //             </div>
            //         </>
            //     }
            // />
        );
    };

    const columns = [
        {
            key: "topic",
            title: 'Topic / Subscription',
            dataIndex: "topic",
            render: (topic, item) => renderItem(item, "topic"),
        },
        {
            key: "error",
            title: (translations.error),
            dataIndex: "error",
            sorter: (a, b) => a.error - b.error,
            render: (error, item) => (
                <a className={styles.error} onClick={() => handleShowErrors(item)}>
                    {formatMoney(item.error)}
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
                    count={item.fail}
                    type="fail"
                    topic={item.topic}
                    subscription={item.subscription}
                    markAsSuccess={markAsSuccess}
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
                    markAsSuccess={markAsSuccess}
                    refresh={refresh}
                />
            )
        },
        {
            key: "missing",
            title: (translations.missing),
            dataIndex: "missing",
            render: (missing, item) => (
                <Missing
                    item={item}
                    refresh={refresh}
                />
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
        },
        {
            key: "total",
            title: (translations.total),
            dataIndex: "total",
        },
        // {
        //     key: "action",
        //     type: "action",
        //     width: 180,
        //     render: (action, item) => {

        //         const {topic, subscription} = item;

        //         return (
        //             <div key={`action-${item._id}`}>
        //                 <div>
        //                     <CalculateSingleAction
        //                         subscription={subscription}
        //                         topic={topic}
        //                         refresh={refresh} />
        //                 </div>

        //                 <div>
        //                     <Republish
        //                         title="Republish fails for this subscription?"
        //                         subscription={subscription}
        //                         topic={topic}
        //                         republish={(data) => eventApi.eventsRepublishFailPost(data)}
        //                         refresh={refresh}
        //                         buttonText={translations.republishFail}
        //                     />
        //                 </div>

        //                 <div>
        //                     <Republish
        //                         title="Republish errors for this subscription?"
        //                         subscription={subscription}
        //                         topic={topic}
        //                         republish={(data) => eventApi.eventsRepublishErrorPost(data)}
        //                         refresh={refresh}
        //                         buttonText={translations.republishError}
        //                     />
        //                 </div>

        //                 <div>
        //                     <Republish
        //                         title="Republish precondition fails for this subscription?"
        //                         subscription={subscription}
        //                         topic={topic}
        //                         republish={(data) => eventApi.eventsRepublishPreconditionFailPost(data)}
        //                         refresh={refresh}
        //                         buttonText={translations.republishPreconditionFail}
        //                     />
        //                 </div>

        //                 <div>
        //                     <CleanAnomalyAction item={item} refresh={refresh} />
        //                 </div>

        //                 <div>
        //                     <FixMissingAction item={item} refresh={refresh} />
        //                 </div>

        //                 <div>
        //                     <a
        //                         href={`https://console.cloud.google.com/functions/details/${options.googleZone}/${
        //                             item.subscription
        //                         }?project=${options.googleProjectId}`}
        //                         target="_blank"
        //                         rel="noopener noreferrer"
        //                     >
        //                         <CoffeeOutlined /> Function
        //                     </a>
        //                 </div>

        //                 <div>
        //                     <a
        //                         href={`https://console.cloud.google.com/logs/viewer?project=${
        //                             options.googleProjectId
        //                         }&minLogLevel=0&expandAll=false&resource=cloud_function%2Ffunction_name%2F${
        //                             item.subscription
        //                         }`}
        //                         target="_blank"
        //                         rel="noopener noreferrer"
        //                     >
        //                         <UnorderedListOutlined /> Logs
        //                     </a>
        //                 </div>
        //                 <div>
        //                     <MarkAsFail item={item} refresh={refresh} />
        //                 </div>
        //             </div>
        //         );
        //     },
        // },
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
                rowKey="_id"
                rowClassName="no-hover-row"
                loading={loading}
                columns={columns}
                dataSource={list.filter(filter)}
                responsive
            />

            <ErrorModal
                ref={errorModal}
                onShowEvent={handleShowEvent}
                refresh={refresh}
            />
            <EventModal
                ref={eventModal}
                updateEvent={updateEvent}
                refresh={refresh}
            />
        </div>
    );
})