import { useCallback, useState } from "react";
import { Button, Space, Popover, Input } from "antd";
import { RedoOutlined, LoadingOutlined } from "@ant-design/icons";
import translations from "@/assets/translations";
import { useSseAction } from "@/hooks/useSseAction";
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
    const [value, setValue] = useState();
    const { run: runRepublish, processing: republishing } = useSseAction();
    const { run: runMark, processing: marking } = useSseAction();

    const handleRepublish = useCallback(async (limits?: number) => {
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

        try {
            await runRepublish('/events/republish-single-error', data, { title: translations.actionRepublish });
        } catch {
            return;
        }
    }, [topic, subscription, events, showLimit, error, runRepublish]);

    const handleMarkAsSuccess = useCallback(async (all = false) => {
        try {
            await runMark('/event-subscriptions/mark-single-as-success', {
                topic,
                subscription,
                events: all ? [] : events,
                message: error,
            }, { title: translations.actionMarkAsSuccess });
            await refresh();
        } catch {
            return;
        }
    }, [topic, subscription, events, error, runMark, refresh]);

    if(!showLimit) {
        return (
            <Space size={[8, 8]} wrap>
                 <Button className={styles.btnStyle} size="small" onClick={() => handleRepublish()}>
                    {republishing ? <LoadingOutlined /> : <RedoOutlined />}
                    {" "}
                    {translations.republish}
                </Button>
                <Button className={styles.btnStyle} size="small" onClick={() => handleMarkAsSuccess(false)} icon={<IconShieldDone />} loading={marking}>
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

            <Button className={styles.btnStyle} size="small" onClick={() => handleMarkAsSuccess(true)} icon={<IconShieldDone />} loading={marking}>
                {translations.markAsSuccess}
            </Button>
        </Space>
    );
};

export default ErrorActions;
