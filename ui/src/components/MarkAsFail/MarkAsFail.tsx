import { useState, useCallback } from "react";
import { DatePicker, Popover, Button } from "antd";
import { IconShieldFail } from "@/assets/icons";
import { useSseAction } from "@/hooks/useSseAction";
import translations from "@/assets/translations";
const { RangePicker } = DatePicker;

interface Props {
    item: any;
    refresh: () => {};
}

const MarkAsFail: React.FC<Props> = ({ item, refresh }) => {
    const [range, setRange] = useState([]);
    const { run, processing } = useSseAction();
    const handleMarkAsFail = useCallback(() => {
        run('/event-subscriptions/mark-as-fail', {
            topic: item.topic,
            subscription: item.subscription,
            start: range[0].toDate(),
            end: range[1].toDate(),
        }, { title: translations.actionMarkAsFail }).then(() => {
            refresh();
        }).catch(() => {});
    }, [item, range, run, refresh]);

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
