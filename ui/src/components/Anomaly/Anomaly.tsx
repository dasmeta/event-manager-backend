import React, { useCallback, useState } from "react";
import { Divider, Popconfirm } from "antd";
import { LoadingOutlined } from "@ant-design/icons"
import { isAnomaly } from "@/utils/checker";
import formatMoney from "@/utils/format-number";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";
import styles from "../style.less";

interface Props {
    item: any;
    refresh: () => {};
}

const Anomaly: React.FC<Props> = ({ item, refresh }) => {
    const [processing, setProcessing] = useState(false);

    const handleCleanAnomaly = useCallback(() => {
        setProcessing(true);
        eventSubscriptionApi.eventSubscriptionsCleanAnomalyPost({
            topic: item.topic,
            subscription: item.subscription,
        }).then(() => {
            setProcessing(false);
            refresh();
        });
    }, [item]);

    if (!isAnomaly(item)) {
        return null;
    }

    return (
        <>
            {processing ? (
                <LoadingOutlined />
            ) : (
                <Popconfirm title="Clean Anomaly Subscriptions?" onConfirm={handleCleanAnomaly}>
                    <span className={styles.title}>{formatMoney(item.subscriptionCount - item.topicCount)}</span>
                </Popconfirm>
            )}
        </>
    );
};

export default Anomaly;