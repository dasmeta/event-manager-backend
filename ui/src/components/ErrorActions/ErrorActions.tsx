import { useCallback, useState } from "react";
import { Divider } from "antd";
import { RedoOutlined, LoadingOutlined, CheckOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { eventApi, eventSubscriptionApi } from "@/services/api";

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
        <>
            <a onClick={handleRepublish}>
                {republishing ? <LoadingOutlined /> : <RedoOutlined />}
                {" "}
                {translations.republish}
            </a>
            <Divider type="vertical" />
            <a onClick={handleMarkAsSuccess}>
                {marking ? <LoadingOutlined /> : <CheckOutlined />}
                {" "}
                {translations.markAsSuccess}
            </a>
        </>
    );
};

export default ErrorActions;