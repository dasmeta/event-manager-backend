import React, { useCallback, useState } from "react";
import { Divider, Popconfirm } from "antd";
import { LoadingOutlined } from "@ant-design/icons"
import { isAnomaly } from "@/utils/checker";
import formatMoney from "@/utils/format-number";
import translations from "@/assets/translations";
import { eventSubscriptionApi } from "@/services/api";
import styles from "@/assets/styles";

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
            <Divider type="vertical" />
            {translations.anomaly}:{" "}
            {processing ? (
                <a style={styles.error}>
                    <LoadingOutlined />
                </a>
            ) : (
                <Popconfirm title="Clean Anomaly Subscriptions?" onConfirm={handleCleanAnomaly}>
                    <a style={styles.error}>{formatMoney(item.subscriptionCount - item.topicCount)}</a>
                </Popconfirm>
            )}
        </>
    );
};

export default Anomaly;