import { useState, useCallback } from "react";
import { DatePicker, Popover, Button, message } from "antd";
import { eventSubscriptionApi } from "@/services/api";
import translations from "@/assets/translations";
import { IconShieldFail } from "@/assets/icons";
const { RangePicker } = DatePicker;

interface Props {
    item: any;
    refresh: () => {};
}

const MarkAsFail: React.FC<Props> = ({ item, refresh }) => {
    const [range, setRange] = useState([]);
    const [processing, setProcessing] = useState(false);
    const handleMarkAsFail = useCallback(() => {
        setProcessing(true);
        eventSubscriptionApi.eventSubscriptionsMarkAsFailPost({
            topic: item.topic,
            subscription: item.subscription,
            start: range[0].toDate(),
            end: range[1].toDate(),
        }).then(() => {
            setProcessing(false);
            refresh();
        })
        .catch(() => {
            message.error(translations.somethingWentWrong);
        });
    }, [item, range]);

    return (
        <Popover
            trigger="click"
            title="Mark As Fail"
            placement="leftBottom"
            content={
                <div>
                    <RangePicker
                        placeholder={["Start Time ", "End Time"]}
                        value={range}
                        onChange={value => setRange(value)}
                    />

                    <br />
                    <br />

                    <Button size="small" type="primary" loading={processing} onClick={handleMarkAsFail} disabled={!range.length}>
                        Process
                    </Button>
                </div>
            }
        >
            <Button size="small" icon={<IconShieldFail />}>
                Mark As Fail
            </Button>
        </Popover>
    );
};

export default MarkAsFail;
