import { useCallback, useState } from "react";
import { Button, Space, Popover, Input } from "antd";
import { RedoOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { eventApi, eventSubscriptionApi } from "@/services/api";
import { IconShieldDone } from "@/assets/icons";
import styles from "./ErrorActions.less";

interface Props {
    topic: string;
    subscription: string;
    error?: string;
    events: Array<string>;
    refresh: () => {};
    showLimit?: boolean;
}

const ErrorActions: React.FC<Props> = ({ topic, subscription, error, events, refresh, showLimit = true }) => {
    const [republishing, setRepublishing] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [marking, setMarking] = useState(false);
    const [value, setValue] = useState();

    const handleRepublish = useCallback(async (limits?: number) => {
        setRepublishing(true);
        const data: Record<string, any> = {
            topic,
            subscription,
        };

        if(!showLimit) {
            data.events = events;
        } else {
            data.events = [];
            data.limit = limits;
            data.message = error;
        }

        await eventApi.eventsRepublishSingleErrorPost(data);
        setRepublishing(false);
    }, [topic, subscription, events, showLimit, error]);

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

    if(!showLimit) {
        return (
            <Space size={[8, 8]} wrap>
                 <Button className={styles.btnStyle} size="small" onClick={() => handleRepublish()}>
                    {republishing ? <LoadingOutlined /> : <RedoOutlined />}
                    {" "}
                    {translations.republish}
                </Button>
                <Button className={styles.btnStyle} size="small" onClick={handleMarkAsSuccess} icon={<IconShieldDone />}>
                {translations.markAsSuccess}
            </Button>
            </Space>
        );
    }

    return (
        <Space size={[8, 8]} wrap>
            <Popover
                title={"Select limits for republish"}
                placement="top"
                content={
                    <div>
                        <Input
                            type="number"
                            placeholder="Limit"
                            defaultValue={value}
                            onChange={e => setValue(e.target.value)}
                        />

                        <br />
                        <br />

                        <Button size="small" type="primary" onClick={() => handleRepublish(value)}>
                            Process
                        </Button>
                    </div>
                }
            >
                <Button className={styles.btnStyle} size="small">
                    {republishing ? <LoadingOutlined /> : <RedoOutlined />}
                    {" "}
                    {translations.republish}
                </Button>
            </Popover>

            <Button className={styles.btnStyle} size="small" onClick={handleMarkAsSuccess} icon={<IconShieldDone />}>
                {translations.markAsSuccess}
            </Button>
        </Space>
    );
};

export default ErrorActions;
