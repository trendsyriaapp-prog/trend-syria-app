#!/bin/bash
cp /root/trend-syria-app/trendsyria.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable trendsyria
systemctl start trendsyria
echo "Done!"
