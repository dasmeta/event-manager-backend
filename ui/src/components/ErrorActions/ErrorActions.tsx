import { useCallback, useState } from "react";
import { Button, Space } from "antd";
import { RedoOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { eventApi, eventSubscriptionApi } from "@/services/api";
import { IconShieldDone } from "@/assets/icons";
import styles from "./ErrorActions.less";

interface Props {
    topic: string;
    subscription: string;
    events: Array<string>;
    refresh: () => {};
}

const ErrorActions: React.FC<Props> = ({ topic, subscription, events, refresh }) => {
    const [republishing, setRepublishing] = useState(false);
    const [marking, setMarking] = useState(false);

    const handleRepublish = useCallback(async () => {
        setRepublishing(true);
        await eventApi.eventsRepublishSingleErrorPost({
            topic,
            subscription,
            events
        });
        setRepublishing(false);
    }, [topic, subscription, events]);

    const handleMarkAsSuccess = useCallback(async () => {
        setMarking(true);
        await eventSubscriptionApi.eventSubscriptionsMarkSingleAsSuccessPost({
            topic,
            subscription,
            events
        });
        setMarking(false);
        await refresh();
    }, [topic, subscription, events]);

    return (
        <Space size={[8, 8]} wrap>
            <Button className={styles.btnStyle} size="small" onClick={handleRepublish}>
                {republishing ? <LoadingOutlined /> : <RedoOutlined />}
                {" "}
                {translations.republish}
            </Button>

            <Button className={styles.btnStyle} size="small" onClick={handleMarkAsSuccess} icon={<IconShieldDone />}>
                {translations.markAsSuccess}
            </Button>
        </Space>
    );
};

export default ErrorActions;
